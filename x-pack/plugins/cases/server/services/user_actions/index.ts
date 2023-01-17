/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObject,
  SavedObjectReference,
  SavedObjectsFindResponse,
  SavedObjectsRawDoc,
} from '@kbn/core/server';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { KueryNode } from '@kbn/es-query';
import { isCommentRequestTypePersistableState } from '../../../common/utils/attachments';
import {
  isConnectorUserAction,
  isPushedUserAction,
  isCreateCaseUserAction,
  isCommentUserAction,
} from '../../../common/utils/user_actions';
import type {
  CaseUserActionAttributes,
  CaseUserActionAttributesWithoutConnectorId,
  CaseUserActionResponse,
} from '../../../common/api';
import { Actions, ActionTypes, NONE_CONNECTOR_ID } from '../../../common/api';
import {
  CASE_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
  MAX_DOCS_PER_PAGE,
  CASE_COMMENT_SAVED_OBJECT,
} from '../../../common/constants';
import {
  CASE_REF_NAME,
  COMMENT_REF_NAME,
  CONNECTOR_ID_REFERENCE_NAME,
  EXTERNAL_REFERENCE_REF_NAME,
  PUSH_CONNECTOR_ID_REFERENCE_NAME,
} from '../../common/constants';
import { findConnectorIdReference } from '../transform';
import { buildFilter, combineFilters } from '../../client/utils';
import type { CaseConnectorActivity, CaseConnectorFields, PushInfo, ServiceContext } from './types';
import { defaultSortField, isCommentRequestTypeExternalReferenceSO } from '../../common/utils';
import type { PersistableStateAttachmentTypeRegistry } from '../../attachment_framework/persistable_state_registry';
import { injectPersistableReferencesToSO } from '../../attachment_framework/so_references';
import { UserActionPersister } from './operations/create';
import { UserActionFinder } from './find';

export interface UserActionItem {
  attributes: CaseUserActionAttributesWithoutConnectorId;
  references: SavedObjectReference[];
}

interface MostRecentResults {
  mostRecent: {
    hits: {
      total: number;
      hits: SavedObjectsRawDoc[];
    };
  };
}

interface ConnectorActivityAggsResult {
  references: {
    connectors: {
      ids: {
        buckets: Array<{
          key: string;
          reverse: {
            connectorActivity: {
              buckets: {
                changeConnector: MostRecentResults;
                createCase: MostRecentResults;
                pushInfo: MostRecentResults;
              };
            };
          };
        }>;
      };
    };
  };
}

interface ConnectorFieldsBeforePushAggsResult {
  references: {
    connectors: {
      reverse: {
        ids: {
          buckets: Record<string, MostRecentResults>;
        };
      };
    };
  };
}

export class CaseUserActionService {
  private readonly _creator: UserActionPersister;
  private readonly _finder: UserActionFinder;

  constructor(private readonly context: ServiceContext) {
    this._creator = new UserActionPersister(context);
    this._finder = new UserActionFinder(context);
  }

  public get creator() {
    return this._creator;
  }

  public get finder() {
    return this._finder;
  }

  public async getConnectorFieldsBeforeLatestPush(
    caseId: string,
    pushes: PushInfo[]
  ): Promise<CaseConnectorFields> {
    try {
      this.context.log.debug(
        `Attempting to retrieve the connector fields before the last push for case id: ${caseId}`
      );

      if (pushes.length <= 0) {
        return new Map();
      }

      const connectorsFilter = buildFilter({
        filters: [ActionTypes.connector, ActionTypes.create_case],
        field: 'type',
        operator: 'or',
        type: CASE_USER_ACTION_SAVED_OBJECT,
      });

      const response = await this.context.unsecuredSavedObjectsClient.find<
        CaseUserActionAttributesWithoutConnectorId,
        ConnectorFieldsBeforePushAggsResult
      >({
        type: CASE_USER_ACTION_SAVED_OBJECT,
        hasReference: { type: CASE_SAVED_OBJECT, id: caseId },
        page: 1,
        perPage: 1,
        sortField: defaultSortField,
        aggs: CaseUserActionService.buildConnectorFieldsUsedInPushAggs(pushes),
        filter: connectorsFilter,
      });

      return this.createCaseConnectorFieldsUsedInPushes(response.aggregations);
    } catch (error) {
      this.context.log.error(
        `Error while retrieving the connector fields before the last push: ${caseId}: ${error}`
      );
      throw error;
    }
  }

  private static buildConnectorFieldsUsedInPushAggs(
    pushes: PushInfo[]
  ): Record<string, estypes.AggregationsAggregationContainer> {
    const filters: estypes.AggregationsBuckets<estypes.QueryDslQueryContainer> = {};

    /**
     * Group the user actions by the unique connector ids and bound the time range
     * for that connector's push event. We want to search for the fields before the push timestamp.
     */
    for (const push of pushes) {
      filters[push.connectorId] = {
        bool: {
          filter: [
            {
              // Search for connector field user action prior to the push occurrence
              range: {
                [`${CASE_USER_ACTION_SAVED_OBJECT}.created_at`]: {
                  lt: push.date.toISOString(),
                },
              },
            },
            {
              nested: {
                path: `${CASE_USER_ACTION_SAVED_OBJECT}.references`,
                query: {
                  bool: {
                    filter: [
                      {
                        // We only want to search a time frame for a specific connector id
                        term: {
                          [`${CASE_USER_ACTION_SAVED_OBJECT}.references.id`]: {
                            value: push.connectorId,
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          ],
        },
      };
    }

    return {
      references: {
        nested: {
          path: `${CASE_USER_ACTION_SAVED_OBJECT}.references`,
        },
        aggregations: {
          connectors: {
            filter: {
              // Only search for user actions that have a connector reference aka a reference with type action
              term: {
                [`${CASE_USER_ACTION_SAVED_OBJECT}.references.type`]: 'action',
              },
            },
            aggregations: {
              reverse: {
                reverse_nested: {},
                aggregations: {
                  ids: {
                    filters: {
                      filters,
                    },
                    aggregations: {
                      mostRecent: {
                        top_hits: {
                          sort: [
                            {
                              [`${CASE_USER_ACTION_SAVED_OBJECT}.created_at`]: {
                                order: 'desc',
                              },
                            },
                          ],
                          size: 1,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
  }

  private createCaseConnectorFieldsUsedInPushes(
    aggsResults?: ConnectorFieldsBeforePushAggsResult
  ): CaseConnectorFields {
    const connectorFields: CaseConnectorFields = new Map();

    if (!aggsResults) {
      return connectorFields;
    }

    for (const connectorId of Object.keys(aggsResults.references.connectors.reverse.ids.buckets)) {
      const fields = aggsResults.references.connectors.reverse.ids.buckets[connectorId];

      if (fields.mostRecent.hits.hits.length > 0) {
        const rawFieldsDoc = fields.mostRecent.hits.hits[0];
        const doc =
          this.context.savedObjectsSerializer.rawToSavedObject<CaseUserActionAttributesWithoutConnectorId>(
            rawFieldsDoc
          );

        const fieldsDoc = transformToExternalModel(
          doc,
          this.context.persistableStateAttachmentTypeRegistry
        );

        connectorFields.set(connectorId, fieldsDoc);
      }
    }

    return connectorFields;
  }

  public async getMostRecentUserAction(
    caseId: string
  ): Promise<SavedObject<CaseUserActionResponse> | undefined> {
    try {
      this.context.log.debug(
        `Attempting to retrieve the most recent user action for case id: ${caseId}`
      );

      const id = caseId;
      const type = CASE_SAVED_OBJECT;

      const connectorsFilter = buildFilter({
        filters: [
          ActionTypes.comment,
          ActionTypes.description,
          ActionTypes.tags,
          ActionTypes.title,
        ],
        field: 'type',
        operator: 'or',
        type: CASE_USER_ACTION_SAVED_OBJECT,
      });

      const userActions =
        await this.context.unsecuredSavedObjectsClient.find<CaseUserActionAttributesWithoutConnectorId>(
          {
            type: CASE_USER_ACTION_SAVED_OBJECT,
            hasReference: { type, id },
            page: 1,
            perPage: 1,
            sortField: 'created_at',
            sortOrder: 'desc',
            filter: connectorsFilter,
          }
        );

      if (userActions.saved_objects.length <= 0) {
        return;
      }

      return transformToExternalModel(
        userActions.saved_objects[0],
        this.context.persistableStateAttachmentTypeRegistry
      );
    } catch (error) {
      this.context.log.error(
        `Error while retrieving the most recent user action for case id: ${caseId}: ${error}`
      );
      throw error;
    }
  }

  public async getCaseConnectorInformation(caseId: string): Promise<CaseConnectorActivity[]> {
    try {
      this.context.log.debug(`Attempting to find connector information for case id: ${caseId}`);

      const connectorsFilter = buildFilter({
        filters: [ActionTypes.connector, ActionTypes.create_case, ActionTypes.pushed],
        field: 'type',
        operator: 'or',
        type: CASE_USER_ACTION_SAVED_OBJECT,
      });

      const response = await this.context.unsecuredSavedObjectsClient.find<
        CaseUserActionAttributesWithoutConnectorId,
        ConnectorActivityAggsResult
      >({
        type: CASE_USER_ACTION_SAVED_OBJECT,
        hasReference: { type: CASE_SAVED_OBJECT, id: caseId },
        page: 1,
        perPage: 1,
        sortField: defaultSortField,
        aggs: CaseUserActionService.buildConnectorInfoAggs(),
        filter: connectorsFilter,
      });

      return this.createCaseConnectorInformation(response.aggregations);
    } catch (error) {
      this.context.log.error(
        `Error while retrieving the connector information for case id: ${caseId} ${error}`
      );
      throw error;
    }
  }

  private createCaseConnectorInformation(
    aggsResults?: ConnectorActivityAggsResult
  ): CaseConnectorActivity[] {
    const caseConnectorInfo: CaseConnectorActivity[] = [];

    if (!aggsResults) {
      return caseConnectorInfo;
    }

    for (const connectorInfo of aggsResults.references.connectors.ids.buckets) {
      const changeConnector = connectorInfo.reverse.connectorActivity.buckets.changeConnector;
      const createCase = connectorInfo.reverse.connectorActivity.buckets.createCase;
      let rawFieldsDoc: SavedObjectsRawDoc | undefined;

      if (changeConnector.mostRecent.hits.hits.length > 0) {
        rawFieldsDoc = changeConnector.mostRecent.hits.hits[0];
      } else if (createCase.mostRecent.hits.hits.length > 0) {
        /**
         * If there is ever a connector update user action that takes precedence over the information stored
         * in the create case user action because it indicates that the connector's fields were changed
         */
        rawFieldsDoc = createCase.mostRecent.hits.hits[0];
      }

      let fieldsDoc: SavedObject<CaseUserActionResponse> | undefined;
      if (rawFieldsDoc != null) {
        const doc =
          this.context.savedObjectsSerializer.rawToSavedObject<CaseUserActionAttributesWithoutConnectorId>(
            rawFieldsDoc
          );

        fieldsDoc = transformToExternalModel(
          doc,
          this.context.persistableStateAttachmentTypeRegistry
        );
      }

      const pushInfo = connectorInfo.reverse.connectorActivity.buckets.pushInfo;
      let pushDoc: SavedObject<CaseUserActionResponse> | undefined;

      if (pushInfo.mostRecent.hits.hits.length > 0) {
        const rawPushDoc = pushInfo.mostRecent.hits.hits[0];

        const doc =
          this.context.savedObjectsSerializer.rawToSavedObject<CaseUserActionAttributesWithoutConnectorId>(
            rawPushDoc
          );

        pushDoc = transformToExternalModel(
          doc,
          this.context.persistableStateAttachmentTypeRegistry
        );
      }

      if (fieldsDoc != null) {
        caseConnectorInfo.push({
          connectorId: connectorInfo.key,
          fields: fieldsDoc,
          push: pushDoc,
        });
      } else {
        this.context.log.warn(`Unable to find fields for connector id: ${connectorInfo.key}`);
      }
    }

    return caseConnectorInfo;
  }

  private static buildConnectorInfoAggs(): Record<
    string,
    estypes.AggregationsAggregationContainer
  > {
    return {
      references: {
        nested: {
          path: `${CASE_USER_ACTION_SAVED_OBJECT}.references`,
        },
        aggregations: {
          connectors: {
            filter: {
              term: {
                [`${CASE_USER_ACTION_SAVED_OBJECT}.references.type`]: 'action',
              },
            },
            aggregations: {
              ids: {
                // Bucket by connector id
                terms: {
                  field: `${CASE_USER_ACTION_SAVED_OBJECT}.references.id`,
                  // We're assuming that a case will not have more than 1000 connectors
                  size: 1000,
                },
                aggregations: {
                  reverse: {
                    reverse_nested: {},
                    aggregations: {
                      connectorActivity: {
                        filters: {
                          filters: {
                            // look for connector fields user actions from "change connector" occurrence
                            changeConnector: {
                              term: {
                                [`${CASE_USER_ACTION_SAVED_OBJECT}.attributes.type`]:
                                  ActionTypes.connector,
                              },
                            },
                            // If the case was initialized with a connector, the fields could exist in the create_case
                            // user action
                            createCase: {
                              term: {
                                [`${CASE_USER_ACTION_SAVED_OBJECT}.attributes.type`]:
                                  ActionTypes.create_case,
                              },
                            },
                            // Also grab the most recent push occurrence for the connector
                            pushInfo: {
                              term: {
                                [`${CASE_USER_ACTION_SAVED_OBJECT}.attributes.type`]:
                                  ActionTypes.pushed,
                              },
                            },
                          },
                        },
                        aggregations: {
                          mostRecent: {
                            top_hits: {
                              sort: [
                                {
                                  [`${CASE_USER_ACTION_SAVED_OBJECT}.created_at`]: {
                                    order: 'desc',
                                  },
                                },
                              ],
                              size: 1,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
  }

  public async getAll(caseId: string): Promise<SavedObjectsFindResponse<CaseUserActionResponse>> {
    try {
      const id = caseId;
      const type = CASE_SAVED_OBJECT;

      const userActions =
        await this.context.unsecuredSavedObjectsClient.find<CaseUserActionAttributesWithoutConnectorId>(
          {
            type: CASE_USER_ACTION_SAVED_OBJECT,
            hasReference: { type, id },
            page: 1,
            perPage: MAX_DOCS_PER_PAGE,
            sortField: 'created_at',
            sortOrder: 'asc',
          }
        );

      return transformFindResponseToExternalModel(
        userActions,
        this.context.persistableStateAttachmentTypeRegistry
      );
    } catch (error) {
      this.context.log.error(`Error on GET case user action case id: ${caseId}: ${error}`);
      throw error;
    }
  }

  public async getUserActionIdsForCases(caseIds: string[]) {
    try {
      this.context.log.debug(
        `Attempting to retrieve user actions associated with cases: [${caseIds}]`
      );

      const finder = this.context.unsecuredSavedObjectsClient.createPointInTimeFinder({
        type: CASE_USER_ACTION_SAVED_OBJECT,
        hasReference: caseIds.map((id) => ({ id, type: CASE_SAVED_OBJECT })),
        sortField: 'created_at',
        sortOrder: 'asc',
        /**
         * We only care about the ids so to reduce the data returned we should limit the fields in the response. Core
         * doesn't support retrieving no fields (id would always be returned anyway) so to limit it we'll only request
         * the owner even though we don't need it.
         */
        fields: ['owner'],
        perPage: MAX_DOCS_PER_PAGE,
      });

      const ids: string[] = [];
      for await (const userActionSavedObject of finder.find()) {
        ids.push(...userActionSavedObject.saved_objects.map((userAction) => userAction.id));
      }

      return ids;
    } catch (error) {
      this.context.log.error(`Error retrieving user action ids for cases: [${caseIds}]: ${error}`);
      throw error;
    }
  }

  public async findStatusChanges({
    caseId,
    filter,
  }: {
    caseId: string;
    filter?: KueryNode;
  }): Promise<Array<SavedObject<CaseUserActionResponse>>> {
    try {
      this.context.log.debug('Attempting to find status changes');

      const updateActionFilter = buildFilter({
        filters: Actions.update,
        field: 'action',
        operator: 'or',
        type: CASE_USER_ACTION_SAVED_OBJECT,
      });

      const statusChangeFilter = buildFilter({
        filters: ActionTypes.status,
        field: 'type',
        operator: 'or',
        type: CASE_USER_ACTION_SAVED_OBJECT,
      });

      const combinedFilters = combineFilters([updateActionFilter, statusChangeFilter, filter]);

      const finder =
        this.context.unsecuredSavedObjectsClient.createPointInTimeFinder<CaseUserActionAttributesWithoutConnectorId>(
          {
            type: CASE_USER_ACTION_SAVED_OBJECT,
            hasReference: { type: CASE_SAVED_OBJECT, id: caseId },
            sortField: defaultSortField,
            sortOrder: 'asc',
            filter: combinedFilters,
            perPage: MAX_DOCS_PER_PAGE,
          }
        );

      let userActions: Array<SavedObject<CaseUserActionResponse>> = [];
      for await (const findResults of finder.find()) {
        userActions = userActions.concat(
          findResults.saved_objects.map((so) =>
            transformToExternalModel(so, this.context.persistableStateAttachmentTypeRegistry)
          )
        );
      }

      return userActions;
    } catch (error) {
      this.context.log.error(`Error finding status changes: ${error}`);
      throw error;
    }
  }

  public async getUniqueConnectors({
    caseId,
    filter,
  }: {
    caseId: string;
    filter?: KueryNode;
  }): Promise<Array<{ id: string }>> {
    try {
      this.context.log.debug(`Attempting to count connectors for case id ${caseId}`);
      const connectorsFilter = buildFilter({
        filters: [ActionTypes.connector, ActionTypes.create_case],
        field: 'type',
        operator: 'or',
        type: CASE_USER_ACTION_SAVED_OBJECT,
      });

      const combinedFilter = combineFilters([connectorsFilter, filter]);

      const response = await this.context.unsecuredSavedObjectsClient.find<
        CaseUserActionAttributesWithoutConnectorId,
        { references: { connectors: { ids: { buckets: Array<{ key: string }> } } } }
      >({
        type: CASE_USER_ACTION_SAVED_OBJECT,
        hasReference: { type: CASE_SAVED_OBJECT, id: caseId },
        page: 1,
        perPage: 1,
        sortField: defaultSortField,
        aggs: this.buildCountConnectorsAggs(),
        filter: combinedFilter,
      });

      return (
        response.aggregations?.references?.connectors?.ids?.buckets?.map(({ key }) => ({
          id: key,
        })) ?? []
      );
    } catch (error) {
      this.context.log.error(`Error while counting connectors for case id ${caseId}: ${error}`);
      throw error;
    }
  }

  private buildCountConnectorsAggs(
    /**
     * It is high unlikely for a user to have more than
     * 100 connectors attached to a case
     */
    size: number = 100
  ): Record<string, estypes.AggregationsAggregationContainer> {
    return {
      references: {
        nested: {
          path: `${CASE_USER_ACTION_SAVED_OBJECT}.references`,
        },
        aggregations: {
          connectors: {
            filter: {
              term: {
                [`${CASE_USER_ACTION_SAVED_OBJECT}.references.type`]: 'action',
              },
            },
            aggregations: {
              ids: {
                terms: {
                  field: `${CASE_USER_ACTION_SAVED_OBJECT}.references.id`,
                  size,
                },
              },
            },
          },
        },
      },
    };
  }
}

export function transformFindResponseToExternalModel(
  userActions: SavedObjectsFindResponse<CaseUserActionAttributesWithoutConnectorId>,
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry
): SavedObjectsFindResponse<CaseUserActionResponse> {
  return {
    ...userActions,
    saved_objects: userActions.saved_objects.map((so) => ({
      ...so,
      ...transformToExternalModel(so, persistableStateAttachmentTypeRegistry),
    })),
  };
}

function transformToExternalModel(
  userAction: SavedObject<CaseUserActionAttributesWithoutConnectorId>,
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry
): SavedObject<CaseUserActionResponse> {
  const { references } = userAction;

  const caseId = findReferenceId(CASE_REF_NAME, CASE_SAVED_OBJECT, references) ?? '';
  const commentId =
    findReferenceId(COMMENT_REF_NAME, CASE_COMMENT_SAVED_OBJECT, references) ?? null;
  const payload = addReferenceIdToPayload(userAction, persistableStateAttachmentTypeRegistry);

  return {
    ...userAction,
    attributes: {
      ...userAction.attributes,
      action_id: userAction.id,
      case_id: caseId,
      comment_id: commentId,
      payload,
    } as CaseUserActionResponse,
  };
}

const addReferenceIdToPayload = (
  userAction: SavedObject<CaseUserActionAttributes>,
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry
): CaseUserActionAttributes['payload'] => {
  const connectorId = getConnectorIdFromReferences(userAction);
  const userActionAttributes = userAction.attributes;

  if (isConnectorUserAction(userActionAttributes) || isCreateCaseUserAction(userActionAttributes)) {
    return {
      ...userActionAttributes.payload,
      connector: {
        ...userActionAttributes.payload.connector,
        id: connectorId ?? NONE_CONNECTOR_ID,
      },
    };
  } else if (isPushedUserAction(userActionAttributes)) {
    return {
      ...userAction.attributes.payload,
      externalService: {
        ...userActionAttributes.payload.externalService,
        connector_id: connectorId ?? NONE_CONNECTOR_ID,
      },
    };
  } else if (isCommentUserAction(userActionAttributes)) {
    if (isCommentRequestTypeExternalReferenceSO(userActionAttributes.payload.comment)) {
      const externalReferenceId = findReferenceId(
        EXTERNAL_REFERENCE_REF_NAME,
        userActionAttributes.payload.comment.externalReferenceStorage.soType,
        userAction.references
      );

      return {
        ...userAction.attributes.payload,
        comment: {
          ...userActionAttributes.payload.comment,
          externalReferenceId: externalReferenceId ?? '',
        },
      };
    }

    if (isCommentRequestTypePersistableState(userActionAttributes.payload.comment)) {
      const injectedAttributes = injectPersistableReferencesToSO(
        userActionAttributes.payload.comment,
        userAction.references,
        {
          persistableStateAttachmentTypeRegistry,
        }
      );

      return {
        ...userAction.attributes.payload,
        comment: {
          ...userActionAttributes.payload.comment,
          ...injectedAttributes,
        },
      };
    }
  }

  return userAction.attributes.payload;
};

function getConnectorIdFromReferences(
  userAction: SavedObject<CaseUserActionAttributes>
): string | null {
  const { references } = userAction;

  if (
    isConnectorUserAction(userAction.attributes) ||
    isCreateCaseUserAction(userAction.attributes)
  ) {
    return findConnectorIdReference(CONNECTOR_ID_REFERENCE_NAME, references)?.id ?? null;
  } else if (isPushedUserAction(userAction.attributes)) {
    return findConnectorIdReference(PUSH_CONNECTOR_ID_REFERENCE_NAME, references)?.id ?? null;
  }

  return null;
}

function findReferenceId(
  name: string,
  type: string,
  references: SavedObjectReference[]
): string | undefined {
  return references.find((ref) => ref.name === name && ref.type === type)?.id;
}

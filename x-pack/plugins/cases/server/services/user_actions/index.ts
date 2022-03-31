/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isEmpty } from 'lodash';

import {
  Logger,
  SavedObject,
  SavedObjectReference,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
  SavedObjectsUpdateResponse,
} from 'kibana/server';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { KueryNode } from '@kbn/es-query';
import {
  isConnectorUserAction,
  isPushedUserAction,
  isUserActionType,
  isCreateCaseUserAction,
} from '../../../common/utils/user_actions';
import {
  Actions,
  ActionTypes,
  CaseAttributes,
  CaseUserActionAttributes,
  CaseUserActionAttributesWithoutConnectorId,
  CaseUserActionResponse,
  CommentRequest,
  NONE_CONNECTOR_ID,
  User,
} from '../../../common/api';
import {
  CASE_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
  MAX_DOCS_PER_PAGE,
  CASE_COMMENT_SAVED_OBJECT,
} from '../../../common/constants';
import { ClientArgs } from '..';
import {
  CASE_REF_NAME,
  COMMENT_REF_NAME,
  CONNECTOR_ID_REFERENCE_NAME,
  PUSH_CONNECTOR_ID_REFERENCE_NAME,
} from '../../common/constants';
import { findConnectorIdReference } from '../transform';
import { buildFilter, combineFilters, isTwoArraysDifference } from '../../client/utils';
import { BuilderParameters, BuilderReturnValue, CommonArguments, CreateUserAction } from './types';
import { BuilderFactory } from './builder_factory';
import { defaultSortField } from '../../common/utils';

interface GetCaseUserActionArgs extends ClientArgs {
  caseId: string;
}

export interface UserActionItem {
  attributes: CaseUserActionAttributesWithoutConnectorId;
  references: SavedObjectReference[];
}

interface PostCaseUserActionArgs extends ClientArgs {
  actions: BuilderReturnValue[];
}

interface CreateUserActionES<T> extends ClientArgs {
  attributes: T;
  references: SavedObjectReference[];
}

type CommonUserActionArgs = ClientArgs & CommonArguments;

interface BulkCreateCaseDeletionUserAction extends ClientArgs {
  cases: Array<{ id: string; owner: string; connectorId: string }>;
  user: User;
}

interface GetUserActionItemByDifference extends CommonUserActionArgs {
  field: string;
  originalValue: unknown;
  newValue: unknown;
}

interface BulkCreateBulkUpdateCaseUserActions extends ClientArgs {
  originalCases: Array<SavedObject<CaseAttributes>>;
  updatedCases: Array<SavedObjectsUpdateResponse<CaseAttributes>>;
  user: User;
}

interface BulkCreateAttachmentDeletionUserAction extends Omit<CommonUserActionArgs, 'owner'> {
  attachments: Array<{ id: string; owner: string; attachment: CommentRequest }>;
}

type CreateUserActionClient<T extends keyof BuilderParameters> = CreateUserAction<T> &
  CommonUserActionArgs;

export class CaseUserActionService {
  private static readonly userActionFieldsAllowed: Set<string> = new Set(Object.keys(ActionTypes));

  private readonly builderFactory: BuilderFactory = new BuilderFactory();

  constructor(private readonly log: Logger) {}

  private getUserActionItemByDifference({
    field,
    originalValue,
    newValue,
    caseId,
    owner,
    user,
  }: GetUserActionItemByDifference): BuilderReturnValue[] {
    if (!CaseUserActionService.userActionFieldsAllowed.has(field)) {
      return [];
    }

    if (field === ActionTypes.tags) {
      const tagsUserActionBuilder = this.builderFactory.getBuilder(ActionTypes.tags);
      const compareValues = isTwoArraysDifference(originalValue, newValue);
      const userActions = [];

      if (compareValues && compareValues.addedItems.length > 0) {
        const tagAddUserAction = tagsUserActionBuilder?.build({
          action: Actions.add,
          caseId,
          user,
          owner,
          payload: { tags: compareValues.addedItems },
        });

        if (tagAddUserAction) {
          userActions.push(tagAddUserAction);
        }
      }

      if (compareValues && compareValues.deletedItems.length > 0) {
        const tagsDeleteUserAction = tagsUserActionBuilder?.build({
          action: Actions.delete,
          caseId,
          user,
          owner,
          payload: { tags: compareValues.deletedItems },
        });

        if (tagsDeleteUserAction) {
          userActions.push(tagsDeleteUserAction);
        }
      }

      return userActions;
    }

    if (isUserActionType(field) && newValue != null) {
      const userActionBuilder = this.builderFactory.getBuilder(ActionTypes[field]);
      const fieldUserAction = userActionBuilder?.build({
        caseId,
        owner,
        user,
        payload: { [field]: newValue },
      });

      return fieldUserAction ? [fieldUserAction] : [];
    }

    return [];
  }

  public async bulkCreateCaseDeletion({
    unsecuredSavedObjectsClient,
    cases,
    user,
  }: BulkCreateCaseDeletionUserAction): Promise<void> {
    this.log.debug(`Attempting to create a create case user action`);
    const userActionsWithReferences = cases.reduce<BuilderReturnValue[]>((acc, caseInfo) => {
      const userActionBuilder = this.builderFactory.getBuilder(ActionTypes.delete_case);
      const deleteCaseUserAction = userActionBuilder?.build({
        action: Actions.delete,
        caseId: caseInfo.id,
        user,
        owner: caseInfo.owner,
        connectorId: caseInfo.connectorId,
        payload: {},
      });

      if (deleteCaseUserAction == null) {
        return acc;
      }

      return [...acc, deleteCaseUserAction];
    }, []);

    await this.bulkCreate({ unsecuredSavedObjectsClient, actions: userActionsWithReferences });
  }

  public async bulkCreateUpdateCase({
    unsecuredSavedObjectsClient,
    originalCases,
    updatedCases,
    user,
  }: BulkCreateBulkUpdateCaseUserActions): Promise<void> {
    const userActionsWithReferences = updatedCases.reduce<BuilderReturnValue[]>(
      (acc, updatedCase) => {
        const originalCase = originalCases.find(({ id }) => id === updatedCase.id);

        if (originalCase == null) {
          return acc;
        }

        const caseId = updatedCase.id;
        const owner = originalCase.attributes.owner;

        const userActions: BuilderReturnValue[] = [];
        const updatedFields = Object.keys(updatedCase.attributes);

        updatedFields
          .filter((field) => CaseUserActionService.userActionFieldsAllowed.has(field))
          .forEach((field) => {
            const originalValue = get(originalCase, ['attributes', field]);
            const newValue = get(updatedCase, ['attributes', field]);
            userActions.push(
              ...this.getUserActionItemByDifference({
                unsecuredSavedObjectsClient,
                field,
                originalValue,
                newValue,
                user,
                owner,
                caseId,
              })
            );
          });

        return [...acc, ...userActions];
      },
      []
    );

    await this.bulkCreate({ unsecuredSavedObjectsClient, actions: userActionsWithReferences });
  }

  private async bulkCreateAttachment({
    unsecuredSavedObjectsClient,
    caseId,
    attachments,
    user,
    action = Actions.create,
  }: BulkCreateAttachmentDeletionUserAction): Promise<void> {
    this.log.debug(`Attempting to create a bulk create case user action`);
    const userActionsWithReferences = attachments.reduce<BuilderReturnValue[]>(
      (acc, attachment) => {
        const userActionBuilder = this.builderFactory.getBuilder(ActionTypes.comment);
        const commentUserAction = userActionBuilder?.build({
          action,
          caseId,
          user,
          owner: attachment.owner,
          attachmentId: attachment.id,
          payload: { attachment: attachment.attachment },
        });

        if (commentUserAction == null) {
          return acc;
        }

        return [...acc, commentUserAction];
      },
      []
    );

    await this.bulkCreate({ unsecuredSavedObjectsClient, actions: userActionsWithReferences });
  }

  public async bulkCreateAttachmentDeletion({
    unsecuredSavedObjectsClient,
    caseId,
    attachments,
    user,
  }: BulkCreateAttachmentDeletionUserAction): Promise<void> {
    await this.bulkCreateAttachment({
      unsecuredSavedObjectsClient,
      caseId,
      attachments,
      user,
      action: Actions.delete,
    });
  }

  public async bulkCreateAttachmentCreation({
    unsecuredSavedObjectsClient,
    caseId,
    attachments,
    user,
  }: BulkCreateAttachmentDeletionUserAction): Promise<void> {
    await this.bulkCreateAttachment({
      unsecuredSavedObjectsClient,
      caseId,
      attachments,
      user,
      action: Actions.create,
    });
  }

  public async createUserAction<T extends keyof BuilderParameters>({
    unsecuredSavedObjectsClient,
    action,
    type,
    caseId,
    user,
    owner,
    payload,
    connectorId,
    attachmentId,
  }: CreateUserActionClient<T>) {
    try {
      this.log.debug(`Attempting to create a user action of type: ${type}`);
      const userActionBuilder = this.builderFactory.getBuilder<T>(type);

      const userAction = userActionBuilder?.build({
        action,
        caseId,
        user,
        owner,
        connectorId,
        attachmentId,
        payload,
      });

      if (userAction) {
        const { attributes, references } = userAction;
        await this.create({ unsecuredSavedObjectsClient, attributes, references });
      }
    } catch (error) {
      this.log.error(`Error on creating user action of type: ${type}. Error: ${error}`);
      throw error;
    }
  }

  public async getAll({
    unsecuredSavedObjectsClient,
    caseId,
  }: GetCaseUserActionArgs): Promise<SavedObjectsFindResponse<CaseUserActionResponse>> {
    try {
      const id = caseId;
      const type = CASE_SAVED_OBJECT;

      const userActions =
        await unsecuredSavedObjectsClient.find<CaseUserActionAttributesWithoutConnectorId>({
          type: CASE_USER_ACTION_SAVED_OBJECT,
          hasReference: { type, id },
          page: 1,
          perPage: MAX_DOCS_PER_PAGE,
          sortField: 'created_at',
          sortOrder: 'asc',
        });

      return transformFindResponseToExternalModel(userActions);
    } catch (error) {
      this.log.error(`Error on GET case user action case id: ${caseId}: ${error}`);
      throw error;
    }
  }

  public async create<T>({
    unsecuredSavedObjectsClient,
    attributes,
    references,
  }: CreateUserActionES<T>): Promise<void> {
    try {
      this.log.debug(`Attempting to POST a new case user action`);

      await unsecuredSavedObjectsClient.create<T>(CASE_USER_ACTION_SAVED_OBJECT, attributes, {
        references: references ?? [],
      });
    } catch (error) {
      this.log.error(`Error on POST a new case user action: ${error}`);
      throw error;
    }
  }

  public async bulkCreate({
    unsecuredSavedObjectsClient,
    actions,
  }: PostCaseUserActionArgs): Promise<void> {
    if (isEmpty(actions)) {
      return;
    }

    try {
      this.log.debug(`Attempting to POST a new case user action`);

      await unsecuredSavedObjectsClient.bulkCreate(
        actions.map((action) => ({ type: CASE_USER_ACTION_SAVED_OBJECT, ...action }))
      );
    } catch (error) {
      this.log.error(`Error on POST a new case user action: ${error}`);
      throw error;
    }
  }

  public async findStatusChanges({
    unsecuredSavedObjectsClient,
    caseId,
    filter,
  }: {
    unsecuredSavedObjectsClient: SavedObjectsClientContract;
    caseId: string;
    filter?: KueryNode;
  }): Promise<Array<SavedObject<CaseUserActionResponse>>> {
    try {
      this.log.debug('Attempting to find status changes');

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
        unsecuredSavedObjectsClient.createPointInTimeFinder<CaseUserActionAttributesWithoutConnectorId>(
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
          findResults.saved_objects.map((so) => transformToExternalModel(so))
        );
      }

      return userActions;
    } catch (error) {
      this.log.error(`Error finding status changes: ${error}`);
      throw error;
    }
  }

  public async getUniqueConnectors({
    caseId,
    filter,
    unsecuredSavedObjectsClient,
  }: {
    caseId: string;
    unsecuredSavedObjectsClient: SavedObjectsClientContract;
    filter?: KueryNode;
  }): Promise<Array<{ id: string }>> {
    try {
      this.log.debug(`Attempting to count connectors for case id ${caseId}`);
      const connectorsFilter = buildFilter({
        filters: [ActionTypes.connector, ActionTypes.create_case],
        field: 'type',
        operator: 'or',
        type: CASE_USER_ACTION_SAVED_OBJECT,
      });

      const combinedFilter = combineFilters([connectorsFilter, filter]);

      const response = await unsecuredSavedObjectsClient.find<
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
      this.log.error(`Error while counting connectors for case id ${caseId}: ${error}`);
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
  userActions: SavedObjectsFindResponse<CaseUserActionAttributesWithoutConnectorId>
): SavedObjectsFindResponse<CaseUserActionResponse> {
  return {
    ...userActions,
    saved_objects: userActions.saved_objects.map((so) => ({
      ...so,
      ...transformToExternalModel(so),
    })),
  };
}

function transformToExternalModel(
  userAction: SavedObject<CaseUserActionAttributesWithoutConnectorId>
): SavedObject<CaseUserActionResponse> {
  const { references } = userAction;

  const caseId = findReferenceId(CASE_REF_NAME, CASE_SAVED_OBJECT, references) ?? '';
  const commentId =
    findReferenceId(COMMENT_REF_NAME, CASE_COMMENT_SAVED_OBJECT, references) ?? null;
  const payload = addReferenceIdToPayload(userAction);

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
  userAction: SavedObject<CaseUserActionAttributes>
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

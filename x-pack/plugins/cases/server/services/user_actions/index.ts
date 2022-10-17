/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isEmpty } from 'lodash';

import type {
  Logger,
  SavedObject,
  SavedObjectReference,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
  SavedObjectsUpdateResponse,
} from '@kbn/core/server';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { KueryNode } from '@kbn/es-query';
import { isCommentRequestTypePersistableState } from '../../../common/utils/attachments';
import {
  isConnectorUserAction,
  isPushedUserAction,
  isUserActionType,
  isCreateCaseUserAction,
  isCommentUserAction,
} from '../../../common/utils/user_actions';
import type {
  ActionOperationValues,
  ActionTypeValues,
  CaseAttributes,
  CaseUserActionAttributes,
  CaseUserActionAttributesWithoutConnectorId,
  CaseUserActionResponse,
  CaseUserProfile,
  CaseAssignees,
  CommentRequest,
  User,
} from '../../../common/api';
import { Actions, ActionTypes, NONE_CONNECTOR_ID } from '../../../common/api';
import {
  CASE_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
  MAX_DOCS_PER_PAGE,
  CASE_COMMENT_SAVED_OBJECT,
} from '../../../common/constants';
import type { ClientArgs } from '..';
import {
  CASE_REF_NAME,
  COMMENT_REF_NAME,
  CONNECTOR_ID_REFERENCE_NAME,
  EXTERNAL_REFERENCE_REF_NAME,
  PUSH_CONNECTOR_ID_REFERENCE_NAME,
} from '../../common/constants';
import { findConnectorIdReference } from '../transform';
import { buildFilter, combineFilters, arraysDifference } from '../../client/utils';
import type {
  BuilderParameters,
  BuilderReturnValue,
  CommonArguments,
  CreateUserAction,
  UserActionParameters,
} from './types';
import { BuilderFactory } from './builder_factory';
import { defaultSortField, isCommentRequestTypeExternalReferenceSO } from '../../common/utils';
import type { PersistableStateAttachmentTypeRegistry } from '../../attachment_framework/persistable_state_registry';
import { injectPersistableReferencesToSO } from '../../attachment_framework/so_references';
import type { IndexRefresh } from '../types';
import { isAssigneesArray, isStringArray } from './type_guards';

interface GetCaseUserActionArgs extends ClientArgs {
  caseId: string;
}

export interface UserActionItem {
  attributes: CaseUserActionAttributesWithoutConnectorId;
  references: SavedObjectReference[];
}

interface PostCaseUserActionArgs extends ClientArgs, IndexRefresh {
  actions: BuilderReturnValue[];
}

interface CreateUserActionES<T> extends ClientArgs, IndexRefresh {
  attributes: T;
  references: SavedObjectReference[];
}

type CommonUserActionArgs = ClientArgs & CommonArguments;

interface BulkCreateCaseDeletionUserAction extends ClientArgs, IndexRefresh {
  cases: Array<{ id: string; owner: string; connectorId: string }>;
  user: User;
}

interface GetUserActionItemByDifference extends CommonUserActionArgs {
  field: string;
  originalValue: unknown;
  newValue: unknown;
}

interface TypedUserActionDiffedItems<T> extends GetUserActionItemByDifference {
  originalValue: T[];
  newValue: T[];
}

interface BulkCreateBulkUpdateCaseUserActions extends ClientArgs, IndexRefresh {
  originalCases: Array<SavedObject<CaseAttributes>>;
  updatedCases: Array<SavedObjectsUpdateResponse<CaseAttributes>>;
  user: User;
}

interface BulkCreateAttachmentUserAction extends Omit<CommonUserActionArgs, 'owner'>, IndexRefresh {
  attachments: Array<{ id: string; owner: string; attachment: CommentRequest }>;
}

type CreateUserActionClient<T extends keyof BuilderParameters> = CreateUserAction<T> &
  CommonUserActionArgs &
  IndexRefresh;

type CreatePayloadFunction<Item, ActionType extends ActionTypeValues> = (
  items: Item[]
) => UserActionParameters<ActionType>['payload'];

export class CaseUserActionService {
  private static readonly userActionFieldsAllowed: Set<string> = new Set(Object.keys(ActionTypes));

  private readonly builderFactory: BuilderFactory;

  constructor(
    private readonly log: Logger,
    private readonly persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry
  ) {
    this.builderFactory = new BuilderFactory({
      persistableStateAttachmentTypeRegistry: this.persistableStateAttachmentTypeRegistry,
    });
  }

  private getUserActionItemByDifference(
    params: GetUserActionItemByDifference
  ): BuilderReturnValue[] {
    const { field, originalValue, newValue, caseId, owner, user } = params;

    if (!CaseUserActionService.userActionFieldsAllowed.has(field)) {
      return [];
    } else if (
      field === ActionTypes.assignees &&
      isAssigneesArray(originalValue) &&
      isAssigneesArray(newValue)
    ) {
      return this.buildAssigneesUserActions({ ...params, originalValue, newValue });
    } else if (
      field === ActionTypes.tags &&
      isStringArray(originalValue) &&
      isStringArray(newValue)
    ) {
      return this.buildTagsUserActions({ ...params, originalValue, newValue });
    } else if (isUserActionType(field) && newValue != null) {
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

  private buildAssigneesUserActions(params: TypedUserActionDiffedItems<CaseUserProfile>) {
    const createPayload: CreatePayloadFunction<CaseUserProfile, typeof ActionTypes.assignees> = (
      items: CaseAssignees
    ) => ({ assignees: items });

    return this.buildAddDeleteUserActions(params, createPayload, ActionTypes.assignees);
  }

  private buildTagsUserActions(params: TypedUserActionDiffedItems<string>) {
    const createPayload: CreatePayloadFunction<string, typeof ActionTypes.tags> = (
      items: string[]
    ) => ({
      tags: items,
    });

    return this.buildAddDeleteUserActions(params, createPayload, ActionTypes.tags);
  }

  private buildAddDeleteUserActions<Item, ActionType extends ActionTypeValues>(
    params: TypedUserActionDiffedItems<Item>,
    createPayload: CreatePayloadFunction<Item, ActionType>,
    actionType: ActionType
  ) {
    const { originalValue, newValue } = params;
    const compareValues = arraysDifference(originalValue, newValue);

    const addUserAction = this.buildUserAction({
      commonArgs: params,
      actionType,
      action: Actions.add,
      createPayload,
      modifiedItems: compareValues?.addedItems,
    });
    const deleteUserAction = this.buildUserAction({
      commonArgs: params,
      actionType,
      action: Actions.delete,
      createPayload,
      modifiedItems: compareValues?.deletedItems,
    });

    return [
      ...(addUserAction ? [addUserAction] : []),
      ...(deleteUserAction ? [deleteUserAction] : []),
    ];
  }

  private buildUserAction<Item, ActionType extends ActionTypeValues>({
    commonArgs,
    actionType,
    action,
    createPayload,
    modifiedItems,
  }: {
    commonArgs: CommonUserActionArgs;
    actionType: ActionType;
    action: ActionOperationValues;
    createPayload: CreatePayloadFunction<Item, ActionType>;
    modifiedItems?: Item[] | null;
  }) {
    const userActionBuilder = this.builderFactory.getBuilder(actionType);

    if (!userActionBuilder || !modifiedItems || modifiedItems.length <= 0) {
      return;
    }

    const { caseId, owner, user } = commonArgs;

    const userAction = userActionBuilder.build({
      action,
      caseId,
      user,
      owner,
      payload: createPayload(modifiedItems),
    });

    return userAction;
  }

  public async bulkCreateCaseDeletion({
    unsecuredSavedObjectsClient,
    cases,
    user,
    refresh,
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

    await this.bulkCreate({
      unsecuredSavedObjectsClient,
      actions: userActionsWithReferences,
      refresh,
    });
  }

  public async bulkCreateUpdateCase({
    unsecuredSavedObjectsClient,
    originalCases,
    updatedCases,
    user,
    refresh,
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

    await this.bulkCreate({
      unsecuredSavedObjectsClient,
      actions: userActionsWithReferences,
      refresh,
    });
  }

  private async bulkCreateAttachment({
    unsecuredSavedObjectsClient,
    caseId,
    attachments,
    user,
    action = Actions.create,
    refresh,
  }: BulkCreateAttachmentUserAction): Promise<void> {
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

    await this.bulkCreate({
      unsecuredSavedObjectsClient,
      actions: userActionsWithReferences,
      refresh,
    });
  }

  public async bulkCreateAttachmentDeletion({
    unsecuredSavedObjectsClient,
    caseId,
    attachments,
    user,
    refresh,
  }: BulkCreateAttachmentUserAction): Promise<void> {
    await this.bulkCreateAttachment({
      unsecuredSavedObjectsClient,
      caseId,
      attachments,
      user,
      action: Actions.delete,
      refresh,
    });
  }

  public async bulkCreateAttachmentCreation({
    unsecuredSavedObjectsClient,
    caseId,
    attachments,
    user,
    refresh,
  }: BulkCreateAttachmentUserAction): Promise<void> {
    await this.bulkCreateAttachment({
      unsecuredSavedObjectsClient,
      caseId,
      attachments,
      user,
      action: Actions.create,
      refresh,
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
    refresh,
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
        await this.create({ unsecuredSavedObjectsClient, attributes, references, refresh });
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

      return transformFindResponseToExternalModel(
        userActions,
        this.persistableStateAttachmentTypeRegistry
      );
    } catch (error) {
      this.log.error(`Error on GET case user action case id: ${caseId}: ${error}`);
      throw error;
    }
  }

  public async create<T>({
    unsecuredSavedObjectsClient,
    attributes,
    references,
    refresh,
  }: CreateUserActionES<T>): Promise<void> {
    try {
      this.log.debug(`Attempting to POST a new case user action`);

      await unsecuredSavedObjectsClient.create<T>(CASE_USER_ACTION_SAVED_OBJECT, attributes, {
        references: references ?? [],
        refresh,
      });
    } catch (error) {
      this.log.error(`Error on POST a new case user action: ${error}`);
      throw error;
    }
  }

  public async bulkCreate({
    unsecuredSavedObjectsClient,
    actions,
    refresh,
  }: PostCaseUserActionArgs): Promise<void> {
    if (isEmpty(actions)) {
      return;
    }

    try {
      this.log.debug(`Attempting to POST a new case user action`);

      await unsecuredSavedObjectsClient.bulkCreate(
        actions.map((action) => ({ type: CASE_USER_ACTION_SAVED_OBJECT, ...action })),
        { refresh }
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
          findResults.saved_objects.map((so) =>
            transformToExternalModel(so, this.persistableStateAttachmentTypeRegistry)
          )
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

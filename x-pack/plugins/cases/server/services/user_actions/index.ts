/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isPlainObject, isString } from 'lodash';
import deepEqual from 'fast-deep-equal';

import {
  Logger,
  SavedObject,
  SavedObjectReference,
  SavedObjectsFindResponse,
  SavedObjectsFindResult,
  SavedObjectsUpdateResponse,
} from 'kibana/server';

import {
  CASE_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
  CaseUserActionAttributes,
  MAX_DOCS_PER_PAGE,
  SUB_CASE_SAVED_OBJECT,
  CaseUserActionResponse,
  CASE_COMMENT_SAVED_OBJECT,
  isCreateConnector,
  isPush,
  isUpdateConnector,
  isConnectorUserAction,
  isPushedUserAction,
  User,
  OWNER_FIELD,
  ENABLE_CASE_CONNECTOR,
  CaseStatuses,
  CaseAttributes,
  UserActionField,
  CaseConnector,
  CasePostRequest,
  noneConnectorId,
  CaseExternalServiceBasic,
  CommentRequest,
} from '../../../common';
import { ClientArgs } from '..';
import {
  CASE_REF_NAME,
  COMMENT_REF_NAME,
  CONNECTOR_ID_REFERENCE_NAME,
  PUSH_CONNECTOR_ID_REFERENCE_NAME,
  SUB_CASE_REF_NAME,
} from '../../common';
import { findConnectorIdReference } from '../transform';
import { isTwoArraysDifference } from '../../client/utils';
import { ACTION_SAVED_OBJECT_TYPE } from '../../../../actions/server';

interface GetCaseUserActionArgs extends ClientArgs {
  caseId: string;
  subCaseId?: string;
}

export interface UserActionItem {
  attributes: CaseUserActionAttributes;
  references: SavedObjectReference[];
}

interface PostCaseUserActionArgs extends ClientArgs {
  actions: UserActionItem[];
}

interface CommonUserActionArgs extends ClientArgs {
  caseId: string;
  subCaseId?: string;
  user: User;
  owner: string;
}
interface CreateCaseCreationUserActionArgs extends CommonUserActionArgs {
  payload: CasePostRequest;
}

interface BulkCreateCaseDeletionUserAction extends ClientArgs {
  cases: Array<{ id: string; owner: string; subCaseId?: string; connectorId: string }>;
  user: User;
}

interface CreateStatusUpdateUserAction extends CommonUserActionArgs {
  status: CaseStatuses;
}

interface CreatePushToServiceUserAction extends CommonUserActionArgs {
  externalService: CaseExternalServiceBasic;
}

type CreateSubCaseCreationUserActionArgs = CreateStatusUpdateUserAction;

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

interface CreateAttachmentUserAction extends CommonUserActionArgs {
  // TODO: use enum
  action: 'create' | 'delete' | 'update';
  attachmentId: string;
  attachment: CommentRequest;
}

interface BulkCreateAttachmentDeletionUserAction extends Omit<CommonUserActionArgs, 'owner'> {
  attachments: Array<{ id: string; owner: string }>;
}

export class CaseUserActionService {
  constructor(private readonly log: Logger) {}

  private static readonly userActionFieldsAllowed: Set<UserActionField[0]> = new Set([
    'comment',
    'connector',
    'description',
    'tags',
    'title',
    'status',
    'settings',
    'sub_case',
    OWNER_FIELD,
  ]);

  private createCaseReferences(caseId: string, subCaseId?: string): SavedObjectReference[] {
    return [
      {
        type: CASE_SAVED_OBJECT,
        name: CASE_REF_NAME,
        id: caseId,
      },
      ...(subCaseId
        ? [
            {
              type: SUB_CASE_SAVED_OBJECT,
              name: SUB_CASE_REF_NAME,
              id: subCaseId,
            },
          ]
        : []),
    ];
  }

  private createCommentReferences(commentId: string): SavedObjectReference[] {
    return [
      {
        type: CASE_COMMENT_SAVED_OBJECT,
        name: COMMENT_REF_NAME,
        id: commentId,
      },
    ];
  }

  private getCommonUserActionAttributes({ user, owner }: { user: User; owner: string }) {
    return {
      created_at: new Date().toISOString(),
      created_by: user,
      owner,
    };
  }

  private getUserActionItemByDifference({
    field,
    originalValue,
    newValue,
    caseId,
    subCaseId,
    owner,
    user,
  }: GetUserActionItemByDifference): UserActionItem[] {
    // TODO: Validate if field is allowed. Maybe type it
    // TODO: Break into smaller functions
    // TODO: Type newValue

    if (!CaseUserActionService.userActionFieldsAllowed.has(field)) {
      return [];
    }

    if (isString(originalValue) && isString(newValue) && originalValue !== newValue) {
      return [
        {
          attributes: {
            ...this.getCommonUserActionAttributes({ user, owner }),
            action: 'update',
            fields: [field],
            payload: { [field]: newValue },
          },
          references: this.createCaseReferences(caseId, subCaseId),
        },
      ];
    }

    if (Array.isArray(originalValue) && Array.isArray(newValue)) {
      const compareValues = isTwoArraysDifference(originalValue, newValue);
      const userActions: UserActionItem[] = [];
      if (compareValues && compareValues.addedItems.length > 0) {
        userActions.push({
          attributes: {
            ...this.getCommonUserActionAttributes({ user, owner }),
            action: 'add',
            fields: [field],
            payload: { [field]: compareValues.addedItems },
          },
          references: this.createCaseReferences(caseId, subCaseId),
        });
      }

      if (compareValues && compareValues.deletedItems.length > 0) {
        userActions.push({
          attributes: {
            ...this.getCommonUserActionAttributes({ user, owner }),
            action: 'delete',
            fields: [field],
            payload: { [field]: compareValues.deletedItems },
          },
          references: this.createCaseReferences(caseId, subCaseId),
        });
      }

      return userActions;
    }

    if (
      isPlainObject(originalValue) &&
      isPlainObject(newValue) &&
      !deepEqual(originalValue, newValue)
    ) {
      let payload = { [field]: newValue };
      let references = this.createCaseReferences(caseId, subCaseId);
      // TODO: user enum
      // TODO: Extract logic to functions
      if (field === 'connector') {
        const newValueTyped = newValue as CaseConnector;
        payload = { connector: this.extractConnectorId(newValueTyped) };
        references = [...references, ...this.createConnectorReference(newValueTyped.id)];
      }

      if (field === 'externalService') {
        const newValueTyped = newValue as CaseExternalServiceBasic;
        payload = { externalService: this.extractConnectorIdFromExternalService(newValueTyped) };
        references = [...references, ...this.createConnectorReference(newValueTyped.connector_id)];
      }

      return [
        {
          attributes: {
            ...this.getCommonUserActionAttributes({ user, owner }),
            action: 'update',
            fields: [field],
            payload,
          },
          references,
        },
      ];
    }

    return [];
  }

  private extractConnectorId(connector: CaseConnector): Omit<CaseConnector, 'id'> {
    const { id, ...restConnector } = connector;
    return restConnector;
  }

  private extractConnectorIdFromExternalService(
    externalService: CaseExternalServiceBasic
  ): Omit<CaseExternalServiceBasic, 'connector_id'> {
    const { connector_id: connectorId, ...restExternalService } = externalService;
    return restExternalService;
  }

  private createActionReference(id: string | null, name: string) {
    return id != null && id !== noneConnectorId
      ? [{ id, type: ACTION_SAVED_OBJECT_TYPE, name }]
      : [];
  }

  private createConnectorReference(id: string | null) {
    return this.createActionReference(id, CONNECTOR_ID_REFERENCE_NAME);
  }

  private createConnectorPushReference(id: string | null) {
    return this.createActionReference(id, PUSH_CONNECTOR_ID_REFERENCE_NAME);
  }

  private async createAttachmentUserAction({
    action,
    unsecuredSavedObjectsClient,
    caseId,
    subCaseId,
    attachmentId,
    user,
    attachment,
    owner,
  }: CreateAttachmentUserAction): Promise<void> {
    try {
      this.log.debug(`Attempting to create a create case user action`);
      const userAction = {
        ...this.getCommonUserActionAttributes({ user, owner }),
        // TODO: Take action from enum
        action: [action],
        fields: ['comment'],
        payload: { comment: attachment },
      };

      const references = this.createCaseReferences(caseId, subCaseId);

      await unsecuredSavedObjectsClient.create<CaseUserActionAttributes>(
        CASE_USER_ACTION_SAVED_OBJECT,
        userAction,
        {
          references: [...references, ...this.createCommentReferences(attachmentId)],
        }
      );
    } catch (error) {
      this.log.error(`Error on create a create case user action: ${error}`);
      throw error;
    }
  }

  public async createCaseCreationUserAction({
    unsecuredSavedObjectsClient,
    caseId,
    subCaseId,
    user,
    payload,
    owner,
  }: CreateCaseCreationUserActionArgs): Promise<void> {
    try {
      this.log.debug(`Attempting to create a create case user action`);
      const connectorWithoutId = this.extractConnectorId(payload.connector);

      const userAction = {
        ...this.getCommonUserActionAttributes({ user, owner }),
        // TODO: Take action from enum
        action: 'create',
        fields: ['description', 'status', 'tags', 'title', 'connector', 'settings', OWNER_FIELD],
        payload: { ...payload, connector: connectorWithoutId },
      };

      const references = [
        ...this.createCaseReferences(caseId, subCaseId),
        ...this.createConnectorReference(payload.connector.id),
      ];

      await unsecuredSavedObjectsClient.create<CaseUserActionAttributes>(
        CASE_USER_ACTION_SAVED_OBJECT,
        userAction,
        {
          references,
        }
      );
    } catch (error) {
      this.log.error(`Error on create a create case user action: ${error}`);
      throw error;
    }
  }

  public async bulkCreateCaseDeletionUserAction({
    unsecuredSavedObjectsClient,
    cases,
    user,
  }: BulkCreateCaseDeletionUserAction): Promise<void> {
    this.log.debug(`Attempting to create a create case user action`);
    const userActionsWithReferences = cases.reduce(
      (acc, caseInfo) => [
        ...acc,
        {
          attributes: {
            ...this.getCommonUserActionAttributes({ user, owner: caseInfo.owner }),
            action: 'delete',
            fields: [
              'description',
              'status',
              'tags',
              'title',
              'connector',
              'settings',
              OWNER_FIELD,
              'comment',
              ...(ENABLE_CASE_CONNECTOR ? ['sub_case' as const] : []),
            ],
            payload: {},
          },
          references: [
            ...this.createCaseReferences(caseInfo.id),
            ...this.createConnectorReference(caseInfo.connectorId),
          ],
          // TODO: Fix type
        } as unknown as UserActionItem,
      ],
      [] as UserActionItem[]
    );

    await this.bulkCreate({ unsecuredSavedObjectsClient, actions: userActionsWithReferences });
  }

  public async bulkCreateSubCaseDeletionUserAction({
    unsecuredSavedObjectsClient,
    cases,
    user,
  }: BulkCreateCaseDeletionUserAction): Promise<void> {
    this.log.debug(`Attempting to create a create case user action`);
    const userActionsWithReferences = cases.reduce(
      (acc, caseInfo) => [
        ...acc,
        {
          attributes: {
            ...this.getCommonUserActionAttributes({ user, owner: caseInfo.owner }),
            action: 'delete',
            fields: ['sub_case', 'comment', 'status'],
            payload: {},
          },
          references: this.createCaseReferences(caseInfo.id, caseInfo.subCaseId),
          // TODO: Fix type
        } as unknown as UserActionItem,
      ],
      [] as UserActionItem[]
    );

    await this.bulkCreate({ unsecuredSavedObjectsClient, actions: userActionsWithReferences });
  }

  public async createStatusUpdateUserAction({
    unsecuredSavedObjectsClient,
    caseId,
    user,
    status,
    owner,
  }: CreateStatusUpdateUserAction): Promise<void> {
    try {
      this.log.debug(`Attempting to create a create case user action`);
      const userAction = {
        ...this.getCommonUserActionAttributes({ user, owner }),
        // TODO: Take action from enum
        action: 'update',
        fields: ['status'],
        payload: { status },
      };

      const references = this.createCaseReferences(caseId);

      await unsecuredSavedObjectsClient.create<CaseUserActionAttributes>(
        CASE_USER_ACTION_SAVED_OBJECT,
        userAction,
        {
          references,
        }
      );
    } catch (error) {
      this.log.error(`Error on create a create case user action: ${error}`);
      throw error;
    }
  }

  public async createPushToServiceUserAction({
    unsecuredSavedObjectsClient,
    caseId,
    user,
    externalService,
    owner,
  }: CreatePushToServiceUserAction): Promise<void> {
    try {
      this.log.debug(`Attempting to create a create case user action`);
      const userAction = {
        ...this.getCommonUserActionAttributes({ user, owner }),
        // TODO: Take action from enum
        action: 'push-to-service',
        fields: ['pushed'],
        payload: { externalService: this.extractConnectorIdFromExternalService(externalService) },
      };

      const references = [
        ...this.createCaseReferences(caseId),
        ...this.createConnectorPushReference(externalService.connector_id),
      ];

      await unsecuredSavedObjectsClient.create<CaseUserActionAttributes>(
        CASE_USER_ACTION_SAVED_OBJECT,
        userAction,
        {
          references,
        }
      );
    } catch (error) {
      this.log.error(`Error on create a create case user action: ${error}`);
      throw error;
    }
  }

  public async createSubCaseCreationUserAction({
    unsecuredSavedObjectsClient,
    caseId,
    subCaseId,
    user,
    status,
    owner,
  }: CreateSubCaseCreationUserActionArgs): Promise<void> {
    try {
      this.log.debug(`Attempting to create a create sub case user action`);
      const userAction = {
        // TODO: Take action from enum
        ...this.getCommonUserActionAttributes({ user, owner }),
        action: 'create',
        fields: ['status', 'sub_case'],
        payload: { status },
      };

      const references = this.createCaseReferences(caseId, subCaseId);

      await unsecuredSavedObjectsClient.create<CaseUserActionAttributes>(
        CASE_USER_ACTION_SAVED_OBJECT,
        userAction,
        {
          references,
        }
      );
    } catch (error) {
      this.log.error(`Error on create a create sub case user action: ${error}`);
      throw error;
    }
  }

  public async bulkCreateBulkUpdateCaseUserActions({
    unsecuredSavedObjectsClient,
    originalCases,
    updatedCases,
    user,
  }: BulkCreateBulkUpdateCaseUserActions): Promise<void> {
    const userActionsWithReferences = updatedCases.reduce<UserActionItem[]>((acc, updatedCase) => {
      const originalCase = originalCases.find(({ id }) => id === updatedCase.id);

      if (originalCase == null) {
        return acc;
      }

      const caseId = updatedCase.id;
      const owner = originalCase.attributes.owner;

      const userActions: UserActionItem[] = [];
      const updatedFields = Object.keys(updatedCase.attributes) as UserActionField;

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
    }, []);

    await this.bulkCreate({ unsecuredSavedObjectsClient, actions: userActionsWithReferences });
  }

  public async createAttachmentCreationUserAction(
    args: Omit<CreateAttachmentUserAction, 'action'>
  ): Promise<void> {
    return this.createAttachmentUserAction({ ...args, action: 'create' });
  }

  public async createAttachmentDeletionUserAction(
    args: Omit<CreateAttachmentUserAction, 'action'>
  ): Promise<void> {
    return this.createAttachmentUserAction({ ...args, action: 'delete' });
  }

  public async createAttachmentUpdateUserAction(
    args: Omit<CreateAttachmentUserAction, 'action'>
  ): Promise<void> {
    return this.createAttachmentUserAction({ ...args, action: 'update' });
  }

  public async bulkCreateAttachmentDeletionUserAction({
    unsecuredSavedObjectsClient,
    caseId,
    subCaseId,
    attachments,
    user,
  }: BulkCreateAttachmentDeletionUserAction): Promise<void> {
    this.log.debug(`Attempting to create a create case user action`);
    const userActionsWithReferences = attachments.reduce(
      (acc, attachment) => [
        ...acc,
        {
          attributes: {
            ...this.getCommonUserActionAttributes({ user, owner: attachment.owner }),
            // TODO: Take action from enum
            action: ['delete'],
            fields: ['comment'],
            payload: {},
          },
          references: [
            ...this.createCaseReferences(caseId, subCaseId),
            ...this.createCommentReferences(attachment.id),
          ],
          // TODO: Fix type
        } as unknown as UserActionItem,
      ],
      [] as UserActionItem[]
    );

    await this.bulkCreate({ unsecuredSavedObjectsClient, actions: userActionsWithReferences });
  }

  public async getAll({
    unsecuredSavedObjectsClient,
    caseId,
    subCaseId,
  }: GetCaseUserActionArgs): Promise<SavedObjectsFindResponse<CaseUserActionResponse>> {
    try {
      const id = subCaseId ?? caseId;
      const type = subCaseId ? SUB_CASE_SAVED_OBJECT : CASE_SAVED_OBJECT;

      const userActions = await unsecuredSavedObjectsClient.find<CaseUserActionAttributes>({
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

  public async bulkCreate({
    unsecuredSavedObjectsClient,
    actions,
  }: PostCaseUserActionArgs): Promise<void> {
    try {
      this.log.debug(`Attempting to POST a new case user action`);

      await unsecuredSavedObjectsClient.bulkCreate<CaseUserActionAttributes>(
        actions.map((action) => ({ type: CASE_USER_ACTION_SAVED_OBJECT, ...action }))
      );
    } catch (error) {
      this.log.error(`Error on POST a new case user action: ${error}`);
      throw error;
    }
  }
}

export function transformFindResponseToExternalModel(
  userActions: SavedObjectsFindResponse<CaseUserActionAttributes>
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
  userAction: SavedObjectsFindResult<CaseUserActionAttributes>
): SavedObjectsFindResult<CaseUserActionResponse> {
  const { references } = userAction;

  const caseId = findReferenceId(CASE_REF_NAME, CASE_SAVED_OBJECT, references) ?? '';
  const commentId =
    findReferenceId(COMMENT_REF_NAME, CASE_COMMENT_SAVED_OBJECT, references) ?? null;
  const subCaseId = findReferenceId(SUB_CASE_REF_NAME, SUB_CASE_SAVED_OBJECT, references) ?? '';
  const payload = addReferenceIdToPayload(userAction);

  return {
    ...userAction,
    attributes: {
      ...userAction.attributes,
      action_id: userAction.id,
      case_id: caseId,
      comment_id: commentId,
      sub_case_id: subCaseId,
      payload,
    },
  };
}

const addReferenceIdToPayload = (
  userAction: SavedObjectsFindResult<CaseUserActionAttributes>
): CaseUserActionAttributes['payload'] => {
  const connectorId = getConnectorIdFromReferences(userAction);

  if (isConnectorUserAction(userAction.attributes)) {
    return {
      ...userAction.attributes.payload,
      connector: {
        ...userAction.attributes.payload.connector,
        id: connectorId,
      },
    };
  } else if (isPushedUserAction(userAction.attributes)) {
    return {
      ...userAction.attributes.payload,
      externalService: {
        ...userAction.attributes.payload.externalService,
        connector_id: connectorId,
      },
    };
  }

  return userAction.attributes.payload;
};

function getConnectorIdFromReferences(
  userAction: SavedObjectsFindResult<CaseUserActionAttributes>
): string | null {
  const {
    attributes: { action, fields },
    references,
  } = userAction;

  if (isCreateConnector(action, fields) || isUpdateConnector(action, fields)) {
    return findConnectorIdReference(CONNECTOR_ID_REFERENCE_NAME, references)?.id ?? null;
  } else if (isPush(action, fields)) {
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

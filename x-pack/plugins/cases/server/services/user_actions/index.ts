/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';

import {
  Logger,
  SavedObject,
  SavedObjectReference,
  SavedObjectsFindResponse,
  SavedObjectsFindResult,
  SavedObjectsUpdateResponse,
} from 'kibana/server';

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
  CaseExternalServiceBasic,
  CasePostRequest,
  CaseStatuses,
  CaseUserActionAttributes,
  CaseUserActionAttributesWithoutConnectorId,
  CaseUserActionResponse,
  CommentRequest,
  noneConnectorId,
  SubCaseAttributes,
  User,
} from '../../../common/api';
import {
  CASE_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
  MAX_DOCS_PER_PAGE,
  SUB_CASE_SAVED_OBJECT,
  CASE_COMMENT_SAVED_OBJECT,
} from '../../../common/constants';
import { ClientArgs } from '..';
import {
  CASE_REF_NAME,
  COMMENT_REF_NAME,
  CONNECTOR_ID_REFERENCE_NAME,
  PUSH_CONNECTOR_ID_REFERENCE_NAME,
  SUB_CASE_REF_NAME,
} from '../../common/constants';
import { findConnectorIdReference } from '../transform';
import { isTwoArraysDifference } from '../../client/utils';
import { CommentUserAction } from '../../../common/api/cases/user_actions/comment';
import { StatusUserAction } from '../../../common/api/cases/user_actions/status';
import { PushedUserActionWithoutConnectorId } from '../../../common/api/cases/user_actions/pushed';
import { UserActionBuilder } from './builder';
import { CreateCaseUserActionWithoutConnectorId } from '../../../common/api/cases/user_actions/create_case';

interface GetCaseUserActionArgs extends ClientArgs {
  caseId: string;
  subCaseId?: string;
}

export interface UserActionItem {
  attributes: CaseUserActionAttributesWithoutConnectorId;
  references: SavedObjectReference[];
}

interface PostCaseUserActionArgs extends ClientArgs {
  actions: UserActionItem[];
}

interface CreateUserActionES<T> extends ClientArgs {
  attributes: T;
  references: SavedObjectReference[];
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

interface GetUserActionItemByDifference extends CommonUserActionArgs {
  field: string;
  originalValue: unknown;
  newValue: unknown;
}

interface BulkCreateBulkUpdateCaseUserActions extends ClientArgs {
  originalCases: Array<SavedObject<CaseAttributes | SubCaseAttributes>>;
  updatedCases: Array<SavedObjectsUpdateResponse<CaseAttributes | SubCaseAttributes>>;
  user: User;
}

interface CreateAttachmentUserAction extends CommonUserActionArgs {
  action: 'create' | 'delete' | 'update';
  attachmentId: string;
  attachment: CommentRequest;
}

interface BulkCreateAttachmentDeletionUserAction extends Omit<CommonUserActionArgs, 'owner'> {
  attachments: Array<{ id: string; owner: string; attachment: CommentRequest }>;
}

export class CaseUserActionService {
  private static readonly userActionFieldsAllowed: Set<string> = new Set(Object.keys(ActionTypes));

  private readonly builder: UserActionBuilder = new UserActionBuilder();

  constructor(private readonly log: Logger) {}

  private getUserActionItemByDifference({
    field,
    originalValue,
    newValue,
    caseId,
    subCaseId,
    owner,
    user,
  }: GetUserActionItemByDifference): UserActionItem[] {
    if (!CaseUserActionService.userActionFieldsAllowed.has(field)) {
      return [];
    }

    if (field === 'tags') {
      const compareValues = isTwoArraysDifference(originalValue, newValue);
      const userActions: UserActionItem[] = [];
      if (compareValues && compareValues.addedItems.length > 0) {
        const tagAddUserAction = this.builder.buildUserAction<'tags'>('tags', {
          caseId,
          subCaseId,
          owner,
          user,
          action: 'add',
          tags: compareValues.addedItems,
        });

        if (tagAddUserAction) {
          userActions.push(tagAddUserAction);
        }
      }

      if (compareValues && compareValues.deletedItems.length > 0) {
        const tagsDeleteUserAction = this.builder.buildUserAction<'tags'>('tags', {
          caseId,
          subCaseId,
          owner,
          user,
          action: 'delete',
          tags: compareValues.deletedItems,
        });

        if (tagsDeleteUserAction) {
          userActions.push(tagsDeleteUserAction);
        }
      }

      return userActions;
    }

    if (isUserActionType(field)) {
      const fieldUserAction = this.builder.buildUserAction<typeof field>(field, {
        caseId,
        subCaseId,
        owner,
        user,
        [field]: newValue,
        // TODO: Fix
        connectorId: '',
      });

      return fieldUserAction ? [fieldUserAction] : [];
    }

    return [];
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
      const userAction = this.builder.buildUserAction<'comment'>('comment', {
        action,
        caseId,
        user,
        owner,
        comment: attachment,
        attachmentId,
        subCaseId,
      });

      if (userAction) {
        await this.create<CommentUserAction>({
          unsecuredSavedObjectsClient,
          attributes: userAction.attributes,
          references: userAction.references,
        });
      }
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
      const userAction = this.builder.buildUserAction<'create_case'>('create_case', {
        caseId,
        subCaseId,
        user,
        owner,
        payload,
      });

      if (userAction) {
        await this.create<CreateCaseUserActionWithoutConnectorId>({
          unsecuredSavedObjectsClient,
          attributes: userAction.attributes,
          references: userAction.references,
        });
      }
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
    const userActionsWithReferences = cases.reduce((acc, caseInfo) => {
      const deleteCaseUserAction = this.builder.buildUserAction<'delete_case'>('delete_case', {
        user,
        owner: caseInfo.owner,
        caseId: caseInfo.id,
        connectorId: caseInfo.connectorId,
      });

      return [
        ...acc,
        {
          ...(deleteCaseUserAction ? deleteCaseUserAction : {}),
        },
      ];
    }, [] as UserActionItem[]);

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
      const userAction = this.builder.buildUserAction<'status'>('status', {
        caseId,
        user,
        status,
        owner,
      });

      if (userAction) {
        await this.create<StatusUserAction>({
          unsecuredSavedObjectsClient,
          attributes: userAction.attributes,
          references: userAction.references,
        });
      }
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
      const userAction = this.builder.buildUserAction<'pushed'>('pushed', {
        caseId,
        user,
        externalService,
        owner,
      });

      if (userAction) {
        await this.create<PushedUserActionWithoutConnectorId>({
          unsecuredSavedObjectsClient,
          attributes: userAction.attributes,
          references: userAction.references,
        });
      }
    } catch (error) {
      this.log.error(`Error on create a create case user action: ${error}`);
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
    }, []);

    await this.bulkCreate({ unsecuredSavedObjectsClient, actions: userActionsWithReferences });
  }

  public async createAttachmentCreationUserAction(
    args: Omit<CreateAttachmentUserAction, 'action'>
  ): Promise<void> {
    return this.createAttachmentUserAction({ ...args, action: Actions.create });
  }

  public async createAttachmentDeletionUserAction(
    args: Omit<CreateAttachmentUserAction, 'action'>
  ): Promise<void> {
    return this.createAttachmentUserAction({ ...args, action: Actions.delete });
  }

  public async createAttachmentUpdateUserAction(
    args: Omit<CreateAttachmentUserAction, 'action'>
  ): Promise<void> {
    return this.createAttachmentUserAction({ ...args, action: Actions.update });
  }

  public async bulkCreateAttachmentDeletionUserAction({
    unsecuredSavedObjectsClient,
    caseId,
    subCaseId,
    attachments,
    user,
  }: BulkCreateAttachmentDeletionUserAction): Promise<void> {
    this.log.debug(`Attempting to create a create case user action`);
    const userActionsWithReferences = attachments.reduce((acc, attachment) => {
      const deleteCommentUserAction = this.builder.buildUserAction<'comment'>('comment', {
        action: Actions.delete,
        caseId,
        user,
        owner: attachment.owner,
        comment: attachment.attachment,
        attachmentId: attachment.id,
        subCaseId,
      });
      return [
        ...acc,
        {
          ...(deleteCommentUserAction ? deleteCommentUserAction : {}),
          // TODO: Fix type
        } as unknown as UserActionItem,
      ];
    }, [] as UserActionItem[]);

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
    try {
      this.log.debug(`Attempting to POST a new case user action`);

      await unsecuredSavedObjectsClient.bulkCreate<CaseUserActionAttributesWithoutConnectorId>(
        actions.map((action) => ({ type: CASE_USER_ACTION_SAVED_OBJECT, ...action }))
      );
    } catch (error) {
      this.log.error(`Error on POST a new case user action: ${error}`);
      throw error;
    }
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
  userAction: SavedObjectsFindResult<CaseUserActionAttributesWithoutConnectorId>
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
  const userActionAttributes = userAction.attributes;

  if (isConnectorUserAction(userActionAttributes) || isCreateCaseUserAction(userActionAttributes)) {
    return {
      ...userActionAttributes.payload,
      connector: {
        ...userActionAttributes.payload.connector,
        id: connectorId ?? noneConnectorId,
      },
    };
  } else if (isPushedUserAction(userActionAttributes)) {
    return {
      ...userAction.attributes.payload,
      externalService: {
        ...userActionAttributes.payload.externalService,
        connector_id: connectorId ?? noneConnectorId,
      },
    };
  }

  return userAction.attributes.payload;
};

function getConnectorIdFromReferences(
  userAction: SavedObjectsFindResult<CaseUserActionAttributes>
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

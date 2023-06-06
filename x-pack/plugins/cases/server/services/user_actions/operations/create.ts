/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsBulkResponse } from '@kbn/core/server';
import { get, isEmpty } from 'lodash';
import type { UserActionPersistedAttributes } from '../../../common/types/user_actions';
import { CASE_SAVED_OBJECT, CASE_USER_ACTION_SAVED_OBJECT } from '../../../../common/constants';
import { arraysDifference } from '../../../client/utils';
import { isUserActionType } from '../../../../common/utils/user_actions';
import type {
  ActionTypeValues,
  CaseAssignees,
  CaseUserProfile,
  ActionCategory,
} from '../../../../common/api';
import { Actions, ActionTypes } from '../../../../common/api';
import { BuilderFactory } from '../builder_factory';
import type {
  BuilderParameters,
  BulkCreateAttachmentUserAction,
  BulkCreateBulkUpdateCaseUserActions,
  CommonUserActionArgs,
  CreatePayloadFunction,
  CreateUserActionClient,
  CreateUserActionES,
  GetUserActionItemByDifference,
  PostCaseUserActionArgs,
  ServiceContext,
  TypedUserActionDiffedItems,
  UserActionEvent,
} from '../types';
import { isAssigneesArray, isStringArray } from '../type_guards';
import type { IndexRefresh } from '../../types';
import { UserActionAuditLogger } from '../audit_logger';

export class UserActionPersister {
  private static readonly userActionFieldsAllowed: Set<string> = new Set(Object.keys(ActionTypes));

  private readonly builderFactory: BuilderFactory;
  private readonly auditLogger: UserActionAuditLogger;

  constructor(private readonly context: ServiceContext) {
    this.builderFactory = new BuilderFactory({
      persistableStateAttachmentTypeRegistry: this.context.persistableStateAttachmentTypeRegistry,
    });

    this.auditLogger = new UserActionAuditLogger(this.context.auditLogger);
  }

  public async bulkCreateUpdateCase({
    originalCases,
    updatedCases,
    user,
    refresh,
  }: BulkCreateBulkUpdateCaseUserActions): Promise<void> {
    const builtUserActions = updatedCases.reduce<UserActionEvent[]>((acc, updatedCase) => {
      const originalCase = originalCases.find(({ id }) => id === updatedCase.id);

      if (originalCase == null) {
        return acc;
      }

      const caseId = updatedCase.id;
      const owner = originalCase.attributes.owner;

      const userActions: UserActionEvent[] = [];
      const updatedFields = Object.keys(updatedCase.attributes);

      updatedFields
        .filter((field) => UserActionPersister.userActionFieldsAllowed.has(field))
        .forEach((field) => {
          const originalValue = get(originalCase, ['attributes', field]);
          const newValue = get(updatedCase, ['attributes', field]);
          userActions.push(
            ...this.getUserActionItemByDifference({
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

    await this.bulkCreateAndLog({
      userActions: builtUserActions,
      refresh,
    });
  }

  private getUserActionItemByDifference(params: GetUserActionItemByDifference): UserActionEvent[] {
    const { field, originalValue, newValue, caseId, owner, user } = params;

    if (!UserActionPersister.userActionFieldsAllowed.has(field)) {
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
    action: ActionCategory;
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

  public async bulkCreateAttachmentDeletion({
    caseId,
    attachments,
    user,
    refresh,
  }: BulkCreateAttachmentUserAction): Promise<void> {
    await this.bulkCreateAttachment({
      caseId,
      attachments,
      user,
      action: Actions.delete,
      refresh,
    });
  }

  public async bulkCreateAttachmentCreation({
    caseId,
    attachments,
    user,
    refresh,
  }: BulkCreateAttachmentUserAction): Promise<void> {
    await this.bulkCreateAttachment({
      caseId,
      attachments,
      user,
      action: Actions.create,
      refresh,
    });
  }

  private async bulkCreateAttachment({
    caseId,
    attachments,
    user,
    action = Actions.create,
    refresh,
  }: BulkCreateAttachmentUserAction): Promise<void> {
    this.context.log.debug(`Attempting to create a bulk create case user action`);

    if (attachments.length <= 0) {
      return;
    }

    const userActions = attachments.reduce<UserActionEvent[]>((acc, attachment) => {
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
    }, []);

    await this.bulkCreateAndLog({
      userActions,
      refresh,
    });
  }

  private async bulkCreateAndLog({
    userActions,
    refresh,
  }: { userActions: UserActionEvent[] } & IndexRefresh) {
    const createdUserActions = await this.bulkCreate({ actions: userActions, refresh });

    if (!createdUserActions) {
      return;
    }

    for (let i = 0; i < userActions.length; i++) {
      this.auditLogger.log(userActions[i].eventDetails, createdUserActions.saved_objects[i].id);
    }
  }

  private async bulkCreate({
    actions,
    refresh,
  }: PostCaseUserActionArgs): Promise<
    SavedObjectsBulkResponse<UserActionPersistedAttributes> | undefined
  > {
    if (isEmpty(actions)) {
      return;
    }

    try {
      this.context.log.debug(`Attempting to POST a new case user action`);

      return await this.context.unsecuredSavedObjectsClient.bulkCreate<UserActionPersistedAttributes>(
        actions.map((action) => ({
          type: CASE_USER_ACTION_SAVED_OBJECT,
          ...action.parameters,
        })),
        { refresh }
      );
    } catch (error) {
      this.context.log.error(`Error on POST a new case user action: ${error}`);
      throw error;
    }
  }

  public async createUserAction<T extends keyof BuilderParameters>({
    action,
    type,
    caseId,
    user,
    owner,
    payload,
    connectorId,
    attachmentId,
    refresh,
  }: CreateUserActionClient<T>): Promise<void> {
    try {
      this.context.log.debug(`Attempting to create a user action of type: ${type}`);
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
        await this.createAndLog({ userAction, refresh });
      }
    } catch (error) {
      this.context.log.error(`Error on creating user action of type: ${type}. Error: ${error}`);
      throw error;
    }
  }

  private async createAndLog({
    userAction,
    refresh,
  }: {
    userAction: UserActionEvent;
  } & IndexRefresh): Promise<void> {
    const createdUserAction = await this.create({ ...userAction.parameters, refresh });
    this.auditLogger.log(userAction.eventDetails, createdUserAction.id);
  }

  private async create<T>({
    attributes,
    references,
    refresh,
  }: CreateUserActionES<T>): Promise<SavedObject<T>> {
    try {
      this.context.log.debug(`Attempting to POST a new case user action`);

      return await this.context.unsecuredSavedObjectsClient.create<T>(
        CASE_USER_ACTION_SAVED_OBJECT,
        attributes,
        {
          references: references ?? [],
          refresh,
        }
      );
    } catch (error) {
      this.context.log.error(`Error on POST a new case user action: ${error}`);
      throw error;
    }
  }

  public async bulkAuditLogCaseDeletion(caseIds: string[]): Promise<void> {
    this.context.log.debug(`Attempting to log bulk case deletion`);

    for (const id of caseIds) {
      this.auditLogger.log({
        getMessage: () => `User deleted case id: ${id}`,
        action: Actions.delete,
        descriptiveAction: 'case_user_action_delete_case',
        savedObjectId: id,
        savedObjectType: CASE_SAVED_OBJECT,
      });
    }
  }
}

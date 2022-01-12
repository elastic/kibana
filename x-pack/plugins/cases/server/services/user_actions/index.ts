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
  CaseUserActionAttributes,
  CaseUserActionAttributesWithoutConnectorId,
  CaseUserActionResponse,
  CommentRequest,
  NONE_CONNECTOR_ID,
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
import { BuilderParameters, BuilderReturnValue, CommonArguments, CreateUserAction } from './types';
import { BuilderFactory } from './builder_factory';

interface GetCaseUserActionArgs extends ClientArgs {
  caseId: string;
  subCaseId?: string;
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
  cases: Array<{ id: string; owner: string; subCaseId?: string; connectorId: string }>;
  user: User;
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
    subCaseId,
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
          subCaseId,
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
          subCaseId,
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
        subCaseId,
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

  public async bulkCreateAttachmentDeletion({
    unsecuredSavedObjectsClient,
    caseId,
    subCaseId,
    attachments,
    user,
  }: BulkCreateAttachmentDeletionUserAction): Promise<void> {
    this.log.debug(`Attempting to create a create case user action`);
    const userActionsWithReferences = attachments.reduce<BuilderReturnValue[]>(
      (acc, attachment) => {
        const userActionBuilder = this.builderFactory.getBuilder(ActionTypes.comment);
        const deleteCommentUserAction = userActionBuilder?.build({
          action: Actions.delete,
          caseId,
          subCaseId,
          user,
          owner: attachment.owner,
          attachmentId: attachment.id,
          payload: { attachment: attachment.attachment },
        });

        if (deleteCommentUserAction == null) {
          return acc;
        }

        return [...acc, deleteCommentUserAction];
      },
      []
    );

    await this.bulkCreate({ unsecuredSavedObjectsClient, actions: userActionsWithReferences });
  }

  public async createUserAction<T extends keyof BuilderParameters>({
    unsecuredSavedObjectsClient,
    action,
    type,
    caseId,
    subCaseId,
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
        subCaseId,
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
    } as CaseUserActionResponse,
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

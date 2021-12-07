/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Logger,
  SavedObjectReference,
  SavedObjectsFindResponse,
  SavedObjectsFindResult,
} from 'kibana/server';

import { isCreateConnector, isPush, isUpdateConnector } from '../../../common/utils/user_actions';
import { CaseUserActionAttributes, CaseUserActionResponse } from '../../../common/api';
import {
  CASE_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
  MAX_DOCS_PER_PAGE,
  SUB_CASE_SAVED_OBJECT,
  CASE_COMMENT_SAVED_OBJECT,
} from '../../../common/constants';
import { ClientArgs } from '..';
import { UserActionFieldType } from './types';
import { CASE_REF_NAME, COMMENT_REF_NAME, SUB_CASE_REF_NAME } from '../../common/constants';
import { ConnectorIdReferenceName, PushConnectorIdReferenceName } from './transform';
import { findConnectorIdReference } from '../transform';

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

export class CaseUserActionService {
  constructor(private readonly log: Logger) {}

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
        sortField: 'action_at',
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

  const newValueConnectorId = getConnectorIdFromReferences(UserActionFieldType.New, userAction);
  const oldValueConnectorId = getConnectorIdFromReferences(UserActionFieldType.Old, userAction);

  const caseId = findReferenceId(CASE_REF_NAME, CASE_SAVED_OBJECT, references) ?? '';
  const commentId =
    findReferenceId(COMMENT_REF_NAME, CASE_COMMENT_SAVED_OBJECT, references) ?? null;
  const subCaseId = findReferenceId(SUB_CASE_REF_NAME, SUB_CASE_SAVED_OBJECT, references) ?? '';

  return {
    ...userAction,
    attributes: {
      ...userAction.attributes,
      action_id: userAction.id,
      case_id: caseId,
      comment_id: commentId,
      sub_case_id: subCaseId,
      new_val_connector_id: newValueConnectorId,
      old_val_connector_id: oldValueConnectorId,
    },
  };
}

function getConnectorIdFromReferences(
  fieldType: UserActionFieldType,
  userAction: SavedObjectsFindResult<CaseUserActionAttributes>
): string | null {
  const {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    attributes: { action, action_field },
    references,
  } = userAction;

  if (isCreateConnector(action, action_field) || isUpdateConnector(action, action_field)) {
    return findConnectorIdReference(ConnectorIdReferenceName[fieldType], references)?.id ?? null;
  } else if (isPush(action, action_field)) {
    return (
      findConnectorIdReference(PushConnectorIdReferenceName[fieldType], references)?.id ?? null
    );
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

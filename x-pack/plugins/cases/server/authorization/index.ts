/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsEventCategory, EcsEventOutcome, EcsEventType } from 'kibana/server';
import {
  CASE_COMMENT_SAVED_OBJECT,
  CASE_CONFIGURE_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
} from '../../common/constants';
import { Verbs, ReadOperations, WriteOperations, OperationDetails } from './types';

export * from './authorization';
export * from './audit_logger';
export * from './types';

const createVerbs: Verbs = {
  present: 'create',
  progressive: 'creating',
  past: 'created',
};

const accessVerbs: Verbs = {
  present: 'access',
  progressive: 'accessing',
  past: 'accessed',
};

const updateVerbs: Verbs = {
  present: 'update',
  progressive: 'updating',
  past: 'updated',
};

const deleteVerbs: Verbs = {
  present: 'delete',
  progressive: 'deleting',
  past: 'deleted',
};

const EVENT_TYPES: Record<string, EcsEventType> = {
  creation: 'creation',
  deletion: 'deletion',
  change: 'change',
  access: 'access',
};

/**
 * These values need to match the respective values in this file: x-pack/plugins/security/server/authorization/privileges/feature_privilege_builder/cases.ts
 * These are shared between find, get, get all, and delete/delete all
 * There currently isn't a use case for a user to delete one comment but not all or differentiating between get, get all,
 * and find operations from a privilege stand point.
 */
const DELETE_COMMENT_OPERATION = 'deleteComment';
const ACCESS_COMMENT_OPERATION = 'getComment';
const ACCESS_CASE_OPERATION = 'getCase';

/**
 * Database constant for ECS category for use for audit logging.
 */
export const DATABASE_CATEGORY: EcsEventCategory[] = ['database'];

/**
 * ECS Outcomes for audit logging.
 */
export const ECS_OUTCOMES: Record<string, EcsEventOutcome> = {
  failure: 'failure',
  success: 'success',
  unknown: 'unknown',
};

/**
 * Determines if the passed in operation was a write operation.
 *
 * @param operation an OperationDetails object describing the operation that occurred
 * @returns true if the passed in operation was a write operation
 */
export function isWriteOperation(operation: OperationDetails): boolean {
  return Object.values(WriteOperations).includes(operation.name as WriteOperations);
}

/**
 * Definition of all APIs within the cases backend.
 */
export const Operations: Record<ReadOperations | WriteOperations, OperationDetails> = {
  // case operations
  [WriteOperations.CreateCase]: {
    ecsType: EVENT_TYPES.creation,
    name: WriteOperations.CreateCase,
    action: 'case_create',
    verbs: createVerbs,
    docType: 'case',
    savedObjectType: CASE_SAVED_OBJECT,
  },
  [WriteOperations.DeleteCase]: {
    ecsType: EVENT_TYPES.deletion,
    name: WriteOperations.DeleteCase,
    action: 'case_delete',
    verbs: deleteVerbs,
    docType: 'case',
    savedObjectType: CASE_SAVED_OBJECT,
  },
  [WriteOperations.UpdateCase]: {
    ecsType: EVENT_TYPES.change,
    name: WriteOperations.UpdateCase,
    action: 'case_update',
    verbs: updateVerbs,
    docType: 'case',
    savedObjectType: CASE_SAVED_OBJECT,
  },
  [WriteOperations.PushCase]: {
    ecsType: EVENT_TYPES.change,
    name: WriteOperations.PushCase,
    action: 'case_push',
    verbs: updateVerbs,
    docType: 'case',
    savedObjectType: CASE_SAVED_OBJECT,
  },
  [WriteOperations.CreateConfiguration]: {
    ecsType: EVENT_TYPES.creation,
    name: WriteOperations.CreateConfiguration,
    action: 'case_configuration_create',
    verbs: createVerbs,
    docType: 'case configuration',
    savedObjectType: CASE_CONFIGURE_SAVED_OBJECT,
  },
  [WriteOperations.UpdateConfiguration]: {
    ecsType: EVENT_TYPES.change,
    name: WriteOperations.UpdateConfiguration,
    action: 'case_configuration_update',
    verbs: updateVerbs,
    docType: 'case configuration',
    savedObjectType: CASE_CONFIGURE_SAVED_OBJECT,
  },
  [ReadOperations.FindConfigurations]: {
    ecsType: EVENT_TYPES.access,
    name: ReadOperations.FindConfigurations,
    action: 'case_configuration_find',
    verbs: accessVerbs,
    docType: 'case configurations',
    savedObjectType: CASE_CONFIGURE_SAVED_OBJECT,
  },
  [ReadOperations.GetCase]: {
    ecsType: EVENT_TYPES.access,
    name: ACCESS_CASE_OPERATION,
    action: 'case_get',
    verbs: accessVerbs,
    docType: 'case',
    savedObjectType: CASE_SAVED_OBJECT,
  },
  [ReadOperations.ResolveCase]: {
    ecsType: EVENT_TYPES.access,
    name: ACCESS_CASE_OPERATION,
    action: 'case_resolve',
    verbs: accessVerbs,
    docType: 'case',
    savedObjectType: CASE_SAVED_OBJECT,
  },
  [ReadOperations.FindCases]: {
    ecsType: EVENT_TYPES.access,
    name: ACCESS_CASE_OPERATION,
    action: 'case_find',
    verbs: accessVerbs,
    docType: 'cases',
    savedObjectType: CASE_SAVED_OBJECT,
  },
  [ReadOperations.GetCaseIDsByAlertID]: {
    ecsType: EVENT_TYPES.access,
    name: ACCESS_CASE_OPERATION,
    action: 'case_ids_by_alert_id_get',
    verbs: accessVerbs,
    docType: 'cases',
    savedObjectType: CASE_COMMENT_SAVED_OBJECT,
  },
  [ReadOperations.GetTags]: {
    ecsType: EVENT_TYPES.access,
    name: ReadOperations.GetCase,
    action: 'case_tags_get',
    verbs: accessVerbs,
    docType: 'case',
    savedObjectType: CASE_SAVED_OBJECT,
  },
  [ReadOperations.GetReporters]: {
    ecsType: EVENT_TYPES.access,
    name: ReadOperations.GetReporters,
    action: 'case_reporters_get',
    verbs: accessVerbs,
    docType: 'case',
    savedObjectType: CASE_SAVED_OBJECT,
  },
  [ReadOperations.GetAlertsAttachedToCase]: {
    ecsType: EVENT_TYPES.access,
    name: ACCESS_COMMENT_OPERATION,
    action: 'case_comment_alerts_attach_to_case',
    verbs: accessVerbs,
    docType: 'comments',
    savedObjectType: CASE_COMMENT_SAVED_OBJECT,
  },
  // comments operations
  [WriteOperations.CreateComment]: {
    ecsType: EVENT_TYPES.creation,
    name: WriteOperations.CreateComment,
    action: 'case_comment_create',
    verbs: createVerbs,
    docType: 'comments',
    savedObjectType: CASE_COMMENT_SAVED_OBJECT,
  },
  [WriteOperations.DeleteAllComments]: {
    ecsType: EVENT_TYPES.deletion,
    name: DELETE_COMMENT_OPERATION,
    action: 'case_comment_delete_all',
    verbs: deleteVerbs,
    docType: 'comments',
    savedObjectType: CASE_COMMENT_SAVED_OBJECT,
  },
  [WriteOperations.DeleteComment]: {
    ecsType: EVENT_TYPES.deletion,
    name: DELETE_COMMENT_OPERATION,
    action: 'case_comment_delete',
    verbs: deleteVerbs,
    docType: 'comments',
    savedObjectType: CASE_COMMENT_SAVED_OBJECT,
  },
  [WriteOperations.UpdateComment]: {
    ecsType: EVENT_TYPES.change,
    name: WriteOperations.UpdateComment,
    action: 'case_comment_update',
    verbs: updateVerbs,
    docType: 'comments',
    savedObjectType: CASE_COMMENT_SAVED_OBJECT,
  },
  [ReadOperations.GetComment]: {
    ecsType: EVENT_TYPES.access,
    name: ACCESS_COMMENT_OPERATION,
    action: 'case_comment_get',
    verbs: accessVerbs,
    docType: 'comments',
    savedObjectType: CASE_COMMENT_SAVED_OBJECT,
  },
  [ReadOperations.GetAllComments]: {
    ecsType: EVENT_TYPES.access,
    name: ACCESS_COMMENT_OPERATION,
    action: 'case_comment_get_all',
    verbs: accessVerbs,
    docType: 'comments',
    savedObjectType: CASE_COMMENT_SAVED_OBJECT,
  },
  [ReadOperations.FindComments]: {
    ecsType: EVENT_TYPES.access,
    name: ACCESS_COMMENT_OPERATION,
    action: 'case_comment_find',
    verbs: accessVerbs,
    docType: 'comments',
    savedObjectType: CASE_COMMENT_SAVED_OBJECT,
  },
  // stats operations
  [ReadOperations.GetCaseStatuses]: {
    ecsType: EVENT_TYPES.access,
    name: ACCESS_CASE_OPERATION,
    action: 'case_find_statuses',
    verbs: accessVerbs,
    docType: 'cases',
    savedObjectType: CASE_SAVED_OBJECT,
  },
  // user actions operations
  [ReadOperations.GetUserActions]: {
    ecsType: EVENT_TYPES.access,
    name: ReadOperations.GetUserActions,
    action: 'case_user_actions_get',
    verbs: accessVerbs,
    docType: 'user actions',
    savedObjectType: CASE_USER_ACTION_SAVED_OBJECT,
  },
};

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
 * Definition of all APIs within the cases backend.
 */
export const Operations: Record<ReadOperations | WriteOperations, OperationDetails> = {
  // case operations
  [WriteOperations.CreateCase]: {
    type: EVENT_TYPES.creation,
    name: WriteOperations.CreateCase,
    action: 'create-case',
    verbs: createVerbs,
    docType: 'case',
    savedObjectType: CASE_SAVED_OBJECT,
  },
  [WriteOperations.DeleteCase]: {
    type: EVENT_TYPES.deletion,
    name: WriteOperations.DeleteCase,
    action: 'delete-case',
    verbs: deleteVerbs,
    docType: 'case',
    savedObjectType: CASE_SAVED_OBJECT,
  },
  [WriteOperations.UpdateCase]: {
    type: EVENT_TYPES.change,
    name: WriteOperations.UpdateCase,
    action: 'update-case',
    verbs: updateVerbs,
    docType: 'case',
    savedObjectType: CASE_SAVED_OBJECT,
  },
  [WriteOperations.PushCase]: {
    type: EVENT_TYPES.change,
    name: WriteOperations.PushCase,
    action: 'push-case',
    verbs: updateVerbs,
    docType: 'case',
    savedObjectType: CASE_SAVED_OBJECT,
  },
  [WriteOperations.CreateConfiguration]: {
    type: EVENT_TYPES.creation,
    name: WriteOperations.CreateConfiguration,
    action: 'create-configuration',
    verbs: createVerbs,
    docType: 'case configuration',
    savedObjectType: CASE_CONFIGURE_SAVED_OBJECT,
  },
  [WriteOperations.UpdateConfiguration]: {
    type: EVENT_TYPES.change,
    name: WriteOperations.UpdateConfiguration,
    action: 'update-configuration',
    verbs: updateVerbs,
    docType: 'case configuration',
    savedObjectType: CASE_CONFIGURE_SAVED_OBJECT,
  },
  [ReadOperations.FindConfigurations]: {
    type: EVENT_TYPES.access,
    name: ReadOperations.FindConfigurations,
    action: 'find-configurations',
    verbs: accessVerbs,
    docType: 'case configurations',
    savedObjectType: CASE_CONFIGURE_SAVED_OBJECT,
  },
  [ReadOperations.GetCase]: {
    type: EVENT_TYPES.access,
    name: ACCESS_CASE_OPERATION,
    action: 'get-case',
    verbs: accessVerbs,
    docType: 'case',
    savedObjectType: CASE_SAVED_OBJECT,
  },
  [ReadOperations.FindCases]: {
    type: EVENT_TYPES.access,
    name: ACCESS_CASE_OPERATION,
    action: 'find-cases',
    verbs: accessVerbs,
    docType: 'cases',
    savedObjectType: CASE_SAVED_OBJECT,
  },
  [ReadOperations.GetTags]: {
    type: EVENT_TYPES.access,
    name: ReadOperations.GetCase,
    action: 'get-tags',
    verbs: accessVerbs,
    docType: 'case',
    savedObjectType: CASE_SAVED_OBJECT,
  },
  [ReadOperations.GetReporters]: {
    type: EVENT_TYPES.access,
    name: ReadOperations.GetReporters,
    action: 'get-reporters',
    verbs: accessVerbs,
    docType: 'case',
    savedObjectType: CASE_SAVED_OBJECT,
  },
  // comments operations
  [WriteOperations.CreateComment]: {
    type: EVENT_TYPES.creation,
    name: WriteOperations.CreateComment,
    action: 'create-comment',
    verbs: createVerbs,
    docType: 'comments',
    savedObjectType: CASE_COMMENT_SAVED_OBJECT,
  },
  [WriteOperations.DeleteAllComments]: {
    type: EVENT_TYPES.deletion,
    name: DELETE_COMMENT_OPERATION,
    action: 'delete-all-comments',
    verbs: deleteVerbs,
    docType: 'comments',
    savedObjectType: CASE_COMMENT_SAVED_OBJECT,
  },
  [WriteOperations.DeleteComment]: {
    type: EVENT_TYPES.deletion,
    name: DELETE_COMMENT_OPERATION,
    action: 'delete-comment',
    verbs: deleteVerbs,
    docType: 'comments',
    savedObjectType: CASE_COMMENT_SAVED_OBJECT,
  },
  [WriteOperations.UpdateComment]: {
    type: EVENT_TYPES.change,
    name: WriteOperations.UpdateComment,
    action: 'update-comments',
    verbs: updateVerbs,
    docType: 'comments',
    savedObjectType: CASE_COMMENT_SAVED_OBJECT,
  },
  [ReadOperations.GetComment]: {
    type: EVENT_TYPES.access,
    name: ACCESS_COMMENT_OPERATION,
    action: 'get-comment',
    verbs: accessVerbs,
    docType: 'comments',
    savedObjectType: CASE_COMMENT_SAVED_OBJECT,
  },
  [ReadOperations.GetAllComments]: {
    type: EVENT_TYPES.access,
    name: ACCESS_COMMENT_OPERATION,
    action: 'get-all-comment',
    verbs: accessVerbs,
    docType: 'comments',
    savedObjectType: CASE_COMMENT_SAVED_OBJECT,
  },
  [ReadOperations.FindComments]: {
    type: EVENT_TYPES.access,
    name: ACCESS_COMMENT_OPERATION,
    action: 'find-comments',
    verbs: accessVerbs,
    docType: 'comments',
    savedObjectType: CASE_COMMENT_SAVED_OBJECT,
  },
};

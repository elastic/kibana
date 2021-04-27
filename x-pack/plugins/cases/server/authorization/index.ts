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

const eventTypes: Record<string, EcsEventType> = {
  creation: 'creation',
  deletion: 'deletion',
  change: 'change',
  access: 'access',
};

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
    type: eventTypes.creation,
    name: WriteOperations.CreateCase,
    action: 'create-case',
    verbs: createVerbs,
    docType: 'case',
    savedObjectType: CASE_SAVED_OBJECT,
  },
  [WriteOperations.DeleteCase]: {
    type: eventTypes.deletion,
    name: WriteOperations.DeleteCase,
    action: 'delete-case',
    verbs: deleteVerbs,
    docType: 'case',
    savedObjectType: CASE_SAVED_OBJECT,
  },
  [WriteOperations.UpdateCase]: {
    type: eventTypes.change,
    name: WriteOperations.UpdateCase,
    action: 'update-case',
    verbs: updateVerbs,
    docType: 'case',
    savedObjectType: CASE_SAVED_OBJECT,
  },
  [WriteOperations.CreateConfiguration]: {
    type: eventTypes.creation,
    name: WriteOperations.CreateConfiguration,
    action: 'create-configuration',
    verbs: createVerbs,
    docType: 'case configuration',
    savedObjectType: CASE_CONFIGURE_SAVED_OBJECT,
  },
  [WriteOperations.UpdateConfiguration]: {
    type: eventTypes.change,
    name: WriteOperations.UpdateConfiguration,
    action: 'update-configuration',
    verbs: updateVerbs,
    docType: 'case configuration',
    savedObjectType: CASE_CONFIGURE_SAVED_OBJECT,
  },
  [ReadOperations.FindConfigurations]: {
    type: eventTypes.access,
    name: ReadOperations.FindConfigurations,
    action: 'find-configurations',
    verbs: accessVerbs,
    docType: 'case configurations',
    savedObjectType: CASE_CONFIGURE_SAVED_OBJECT,
  },
  [ReadOperations.GetCase]: {
    type: eventTypes.access,
    name: ReadOperations.GetCase,
    action: 'get-case',
    verbs: accessVerbs,
    docType: 'case',
    savedObjectType: CASE_SAVED_OBJECT,
  },
  [ReadOperations.FindCases]: {
    type: eventTypes.access,
    name: ReadOperations.FindCases,
    action: 'find-cases',
    verbs: accessVerbs,
    docType: 'cases',
    savedObjectType: CASE_SAVED_OBJECT,
  },
  [ReadOperations.GetTags]: {
    type: eventTypes.access,
    name: ReadOperations.GetCase,
    action: 'get-tags',
    verbs: accessVerbs,
    docType: 'case',
    savedObjectType: CASE_SAVED_OBJECT,
  },
  [ReadOperations.GetReporters]: {
    type: eventTypes.access,
    name: ReadOperations.GetReporters,
    action: 'get-reporters',
    verbs: accessVerbs,
    docType: 'case',
    savedObjectType: CASE_SAVED_OBJECT,
  },
  // comments operations
  [WriteOperations.CreateComment]: {
    type: eventTypes.creation,
    name: WriteOperations.CreateComment,
    action: 'create-comment',
    verbs: createVerbs,
    docType: 'comments',
    savedObjectType: CASE_COMMENT_SAVED_OBJECT,
  },
  [WriteOperations.DeleteAllComments]: {
    type: eventTypes.deletion,
    name: WriteOperations.DeleteAllComments,
    action: 'delete-all-comments',
    verbs: deleteVerbs,
    docType: 'comments',
    savedObjectType: CASE_COMMENT_SAVED_OBJECT,
  },
  [WriteOperations.DeleteComment]: {
    type: eventTypes.deletion,
    name: WriteOperations.DeleteComment,
    action: 'delete-comment',
    verbs: deleteVerbs,
    docType: 'comments',
    savedObjectType: CASE_COMMENT_SAVED_OBJECT,
  },
  [WriteOperations.UpdateComment]: {
    type: eventTypes.change,
    name: WriteOperations.UpdateComment,
    action: 'update-comments',
    verbs: updateVerbs,
    docType: 'comments',
    savedObjectType: CASE_COMMENT_SAVED_OBJECT,
  },
  [ReadOperations.GetComment]: {
    type: eventTypes.access,
    name: ReadOperations.GetComment,
    action: 'get-comment',
    verbs: accessVerbs,
    docType: 'comments',
    savedObjectType: CASE_COMMENT_SAVED_OBJECT,
  },
  [ReadOperations.GetAllComments]: {
    type: eventTypes.access,
    name: ReadOperations.GetAllComments,
    action: 'get-all-comment',
    verbs: accessVerbs,
    docType: 'comments',
    savedObjectType: CASE_COMMENT_SAVED_OBJECT,
  },
  [ReadOperations.FindComments]: {
    type: eventTypes.access,
    name: ReadOperations.FindComments,
    action: 'find-comments',
    verbs: accessVerbs,
    docType: 'comments',
    savedObjectType: CASE_COMMENT_SAVED_OBJECT,
  },
};

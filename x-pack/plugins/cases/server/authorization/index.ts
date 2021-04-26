/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventType } from '../../../security/server';
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

/**
 * Definition of all APIs within the cases backend.
 */
export const Operations: Record<ReadOperations | WriteOperations, OperationDetails> = {
  // case operations
  [WriteOperations.CreateCase]: {
    type: EventType.CREATION,
    name: WriteOperations.CreateCase,
    action: 'create-case',
    verbs: createVerbs,
    docType: 'case',
    savedObjectType: CASE_SAVED_OBJECT,
  },
  [WriteOperations.DeleteCase]: {
    type: EventType.DELETION,
    name: WriteOperations.DeleteCase,
    action: 'delete-case',
    verbs: deleteVerbs,
    docType: 'case',
    savedObjectType: CASE_SAVED_OBJECT,
  },
  [WriteOperations.UpdateCase]: {
    type: EventType.CHANGE,
    name: WriteOperations.UpdateCase,
    action: 'update-case',
    verbs: updateVerbs,
    docType: 'case',
    savedObjectType: CASE_SAVED_OBJECT,
  },
  [WriteOperations.CreateConfiguration]: {
    type: EventType.CREATION,
    name: WriteOperations.CreateConfiguration,
    action: 'create-configuration',
    verbs: createVerbs,
    docType: 'case configuration',
    savedObjectType: CASE_CONFIGURE_SAVED_OBJECT,
  },
  [WriteOperations.UpdateConfiguration]: {
    type: EventType.CHANGE,
    name: WriteOperations.UpdateConfiguration,
    action: 'update-configuration',
    verbs: updateVerbs,
    docType: 'case configuration',
    savedObjectType: CASE_CONFIGURE_SAVED_OBJECT,
  },
  [ReadOperations.FindConfigurations]: {
    type: EventType.ACCESS,
    name: ReadOperations.FindConfigurations,
    action: 'find-configurations',
    verbs: accessVerbs,
    docType: 'case configurations',
    savedObjectType: CASE_CONFIGURE_SAVED_OBJECT,
  },
  [ReadOperations.GetCase]: {
    type: EventType.ACCESS,
    name: ReadOperations.GetCase,
    action: 'get-case',
    verbs: accessVerbs,
    docType: 'case',
    savedObjectType: CASE_SAVED_OBJECT,
  },
  [ReadOperations.FindCases]: {
    type: EventType.ACCESS,
    name: ReadOperations.FindCases,
    action: 'find-cases',
    verbs: accessVerbs,
    docType: 'cases',
    savedObjectType: CASE_SAVED_OBJECT,
  },
  [ReadOperations.GetTags]: {
    type: EventType.ACCESS,
    name: ReadOperations.GetCase,
    action: 'get-tags',
    verbs: accessVerbs,
    docType: 'case',
    savedObjectType: CASE_SAVED_OBJECT,
  },
  [ReadOperations.GetReporters]: {
    type: EventType.ACCESS,
    name: ReadOperations.GetReporters,
    action: 'get-reporters',
    verbs: accessVerbs,
    docType: 'case',
    savedObjectType: CASE_SAVED_OBJECT,
  },
  // comments operations
  [WriteOperations.CreateComment]: {
    type: EventType.CREATION,
    name: WriteOperations.CreateComment,
    action: 'create-comment',
    verbs: createVerbs,
    docType: 'comments',
    savedObjectType: CASE_COMMENT_SAVED_OBJECT,
  },
  [WriteOperations.DeleteAllComments]: {
    type: EventType.DELETION,
    name: WriteOperations.DeleteAllComments,
    action: 'delete-all-comments',
    verbs: deleteVerbs,
    docType: 'comments',
    savedObjectType: CASE_COMMENT_SAVED_OBJECT,
  },
  [WriteOperations.DeleteComment]: {
    type: EventType.DELETION,
    name: WriteOperations.DeleteComment,
    action: 'delete-comment',
    verbs: deleteVerbs,
    docType: 'comments',
    savedObjectType: CASE_COMMENT_SAVED_OBJECT,
  },
  [WriteOperations.UpdateComment]: {
    type: EventType.CHANGE,
    name: WriteOperations.UpdateComment,
    action: 'update-comments',
    verbs: updateVerbs,
    docType: 'comments',
    savedObjectType: CASE_COMMENT_SAVED_OBJECT,
  },
  [ReadOperations.GetComment]: {
    type: EventType.ACCESS,
    name: ReadOperations.GetComment,
    action: 'get-comment',
    verbs: accessVerbs,
    docType: 'comments',
    savedObjectType: CASE_COMMENT_SAVED_OBJECT,
  },
  [ReadOperations.GetAllComments]: {
    type: EventType.ACCESS,
    name: ReadOperations.GetAllComments,
    action: 'get-all-comment',
    verbs: accessVerbs,
    docType: 'comments',
    savedObjectType: CASE_COMMENT_SAVED_OBJECT,
  },
  [ReadOperations.FindComments]: {
    type: EventType.ACCESS,
    name: ReadOperations.FindComments,
    action: 'find-comments',
    verbs: accessVerbs,
    docType: 'comments',
    savedObjectType: CASE_COMMENT_SAVED_OBJECT,
  },
};

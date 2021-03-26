/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventType } from '../../../security/server';
import { CASE_SAVED_OBJECT } from '../../common/constants';
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
};

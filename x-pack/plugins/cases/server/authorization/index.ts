/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventType } from '../../../security/server';
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
  past: 'delated',
};

export const Operations: Record<ReadOperations | WriteOperations, OperationDetails> = {
  // case operations
  [WriteOperations.CreateCase]: {
    type: EventType.CREATION,
    name: WriteOperations.CreateCase,
    action: 'create-case',
    verbs: createVerbs,
    docType: 'case',
  },
  [WriteOperations.DeleteCase]: {
    type: EventType.DELETION,
    name: WriteOperations.DeleteCase,
    action: 'delete-case',
    verbs: deleteVerbs,
    docType: 'case',
  },
  [WriteOperations.UpdateCase]: {
    type: EventType.CHANGE,
    name: WriteOperations.UpdateCase,
    action: 'update-case',
    verbs: updateVerbs,
    docType: 'case',
  },
  [ReadOperations.GetCase]: {
    type: EventType.ACCESS,
    name: ReadOperations.GetCase,
    action: 'get-case',
    verbs: accessVerbs,
    docType: 'case',
  },
  [ReadOperations.FindCases]: {
    type: EventType.ACCESS,
    name: ReadOperations.FindCases,
    action: 'find-cases',
    verbs: accessVerbs,
    docType: 'cases',
  },
};

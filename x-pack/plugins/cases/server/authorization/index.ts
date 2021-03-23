/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventType } from '../../../security/server';

export * from './authorization';
export * from './audit_logger';
export * from './types';

export interface OperationDetails {
  type: EventType;
  name: ReadOperations | WriteOperations;
  action: string;
}

// TODO: we need to have an operation per entity route so I think we need to create a bunch like
//  getCase, getComment, getSubCase etc for each, need to think of a clever way of creating them for all the routes easily?
enum ReadOperations {
  GetCase = 'getCase',
  FindCases = 'findCases',
}

// TODO: comments
enum WriteOperations {
  CreateCase = 'createCase',
  DeleteCase = 'deleteCase',
  UpdateCase = 'updateCase',
}

export const Operations: Record<ReadOperations | WriteOperations, OperationDetails> = {
  // case operations
  [WriteOperations.CreateCase]: {
    type: EventType.CREATION,
    name: WriteOperations.CreateCase,
    action: 'create-case',
  },
  [WriteOperations.DeleteCase]: {
    type: EventType.DELETION,
    name: WriteOperations.DeleteCase,
    action: 'delete-case',
  },
  [WriteOperations.UpdateCase]: {
    type: EventType.CHANGE,
    name: WriteOperations.UpdateCase,
    action: 'update-case',
  },
  [ReadOperations.GetCase]: {
    type: EventType.ACCESS,
    name: ReadOperations.GetCase,
    action: 'get-case',
  },
  [ReadOperations.FindCases]: {
    type: EventType.ACCESS,
    name: ReadOperations.FindCases,
    action: 'find-cases',
  },
};

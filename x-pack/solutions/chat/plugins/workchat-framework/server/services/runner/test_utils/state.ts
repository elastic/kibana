/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowState } from '@kbn/wc-framework-types-server';
import { createEmptyState } from '../workflows/utils/workflow_state';

export type MockedState = jest.Mocked<WorkflowState>;

export const createMockedState = (): MockedState => {
  const state = createEmptyState();

  jest.spyOn(state, 'has');
  jest.spyOn(state, 'get');
  jest.spyOn(state, 'getKeys');
  jest.spyOn(state, 'set');

  return state as MockedState;
};

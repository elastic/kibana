/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowState } from '@kbn/wc-framework-types-server';

export const createEmptyState = (): WorkflowState => {
  return new WorkflowStateImpl();
};

export const createInitialState = ({
  inputs,
}: {
  inputs: Record<string, unknown>;
}): WorkflowState => {
  const state = createEmptyState();

  Object.entries(inputs).forEach(([key, value]) => {
    state.set(key, value);
  });

  return state;
};

class WorkflowStateImpl implements WorkflowState {
  private readonly _state = new Map<string, unknown>();

  has(key: string): boolean {
    return this._state.has(key);
  }
  get<T = unknown>(key: string): T {
    if (!this._state.has(key)) {
      throw new Error(`Key ${key} not found in state`);
    }
    return this._state.get(key) as T;
  }
  getKeys(): string[] {
    return [...this._state.keys()];
  }
  set<T>(key: string, value: T): void {
    this._state.set(key, value);
  }
}

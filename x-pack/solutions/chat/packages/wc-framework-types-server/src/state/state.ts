/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Represents the workflow state, that gets propagated through nodes during execution.
 */
export interface WorkflowState {
  has(key: string): boolean;
  get<T = unknown>(key: string): T;
  getKeys(): string[];
  set<T>(key: string, value: T): void;
}

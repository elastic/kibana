/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// The in-memory state
export interface State {
  layerId: string;
  accessor?: string;
}

// The expression function configuration
export interface ExampleConfig extends State {
  title: string;
  mode: 'reduced' | 'full';
}

// The state which is stored in the saved object
export type PersistableState = State;

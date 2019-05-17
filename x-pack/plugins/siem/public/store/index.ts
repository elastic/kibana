/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export * from './model';
export * from './reducer';
export * from './selectors';

import { createStore } from './store';

const store = createStore();

export { store, createStore };

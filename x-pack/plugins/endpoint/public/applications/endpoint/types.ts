/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import reducers from './reducers';

// export type GlobalState = ReturnType<typeof reducers>;

export interface GlobalState {
  [key: string]: any;
} // TODO: replace once `reducers` are in place

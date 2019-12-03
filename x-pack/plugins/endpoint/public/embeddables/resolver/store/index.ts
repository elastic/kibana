/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createStore } from 'redux';
import { HttpServiceBase } from 'kibana/public';
import { resolverReducer } from './reducer';

export const storeFactory = ({ httpServiceBase }: { httpServiceBase: HttpServiceBase }) => {
  const store = createStore(resolverReducer, undefined, applyMiddleware());
  return {
    store,
  };
};

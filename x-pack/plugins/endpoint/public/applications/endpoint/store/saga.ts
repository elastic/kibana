/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart } from 'kibana/public';
import { createSagaMiddleware, SagaContext } from '../lib';
import { endpointListSaga } from './endpoint_list';

export const appSagaFactory = (coreStart: CoreStart) => {
  return createSagaMiddleware(async (sagaContext: SagaContext) => {
    await Promise.all([
      // Concerns specific sagas here
      endpointListSaga(sagaContext, coreStart),
    ]);
  });
};

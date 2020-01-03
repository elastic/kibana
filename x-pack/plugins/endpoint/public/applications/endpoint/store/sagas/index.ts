/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSagaMiddleware, SagaContext } from '../../lib';

export const endpointAppSagas = createSagaMiddleware(async (sagaContext: SagaContext) => {
  await Promise.all([
    // Individual Sagas go here, once they exist. Example:
    // endpointsListSaga(sagaContext);
  ]);
});

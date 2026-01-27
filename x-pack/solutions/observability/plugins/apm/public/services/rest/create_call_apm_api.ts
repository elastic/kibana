/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APMClient } from '@kbn/apm-api-client';
import { createCallApmApi as createCallApmApiShared } from '@kbn/apm-api-client';
import type { CoreSetup, CoreStart } from '@kbn/core/public';

export let callApmApi: APMClient = () => {
  throw new Error('callApmApi has to be initialized before used. Call createCallApmApi first.');
};

export function createCallApmApi(core: CoreStart | CoreSetup) {
  callApmApi = createCallApmApiShared(core);
}

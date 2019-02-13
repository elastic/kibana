/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { HapiBackendFrameworkAdapter } from '../hapi_framework_adapter';
import { contractTests } from './test_contract';

let server: any;
contractTests('Hapi Framework Adapter', {
  async before() {
    server = new Hapi.Server({ port: 111111 });
    server.start();
  },
  async after() {
    await server.stop();
  },
  adapterSetup: () => {
    return new HapiBackendFrameworkAdapter(undefined, server);
  },
});

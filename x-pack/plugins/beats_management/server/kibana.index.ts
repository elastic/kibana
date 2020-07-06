/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaLegacyServer } from './lib/adapters/framework/adapter_types';
import { compose } from './lib/compose/kibana';
import { initManagementServer } from './management_server';

export const initServerWithKibana = (server: KibanaLegacyServer) => {
  const libs = compose(server);
  initManagementServer(libs);
};

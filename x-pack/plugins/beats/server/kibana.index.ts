/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { compose } from './lib/compose/kibana';
import { initManagementServer } from './management_server';

export const initServerWithKibana = (hapiServer: Server) => {
  const libs = compose(hapiServer);
  initManagementServer(libs);
};

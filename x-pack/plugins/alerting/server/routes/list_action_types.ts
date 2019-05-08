/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';

import { APP_ID } from '../../common/constants';
import { Server } from '../types';

interface ListActionTypesRequest extends Hapi.Request {
  server: Server;
}

export function listActionTypesRoute(server: any) {
  server.route({
    method: 'GET',
    path: `/api/${APP_ID}/action_types`,
    async handler(request: ListActionTypesRequest) {
      return request.server.alerting().actionTypes.list();
    },
  });
}

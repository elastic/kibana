/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import Hapi from 'hapi';

import { APP_ID } from '../../common/constants';
import { Server } from '../types';

interface GetActionRequest extends Hapi.Request {
  server: Server;
  params: {
    id: string;
  };
}

export function getActionRoute(server: Hapi.Server) {
  server.route({
    method: 'GET',
    path: `/api/${APP_ID}/action/{id}`,
    options: {
      validate: {
        params: Joi.object()
          .keys({
            id: Joi.string().required(),
          })
          .required(),
      },
    },
    async handler(request: GetActionRequest) {
      const { id } = request.params;
      const savedObjectsClient = request.getSavedObjectsClient();
      return await request.server.alerting().actions.get(savedObjectsClient, id);
    },
  });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import Joi from 'joi';

import { APP_ID } from '../../common/constants';
import { Server } from '../types';

interface DeleteActionRequest extends Hapi.Request {
  server: Server;
  params: {
    id: string;
  };
}

export function deleteActionRoute(server: Hapi.Server) {
  server.route({
    method: 'DELETE',
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
    async handler(request: DeleteActionRequest) {
      const { id } = request.params;
      const savedObjectsClient = request.getSavedObjectsClient();
      return await request.server.alerting().actions.delete(savedObjectsClient, id);
    },
  });
}

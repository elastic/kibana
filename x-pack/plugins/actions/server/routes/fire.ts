/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import Hapi from 'hapi';
import { WithoutQueryAndParams } from '../types';

interface FireRequest extends WithoutQueryAndParams<Hapi.Request> {
  query: {
    overwrite: boolean;
  };
  params: {
    id: string;
  };
  payload: {
    params: Record<string, any>;
  };
}

export function fireRoute(server: Hapi.Server) {
  server.route({
    method: 'POST',
    path: '/api/action/{id}/fire',
    options: {
      validate: {
        options: {
          abortEarly: false,
        },
        params: Joi.object()
          .keys({
            id: Joi.string().required(),
          })
          .required(),
        payload: Joi.object()
          .keys({
            params: Joi.object(),
          })
          .required(),
      },
    },
    async handler(request: FireRequest) {
      const { id } = request.params;
      const params = request.payload.params;
      const actionsClient = request.getActionsClient!();

      await actionsClient.fire({ id, params });

      return { success: true };
    },
  });
}

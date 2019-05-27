/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import Hapi from 'hapi';

interface UpdateRequest extends Hapi.Request {
  params: {
    id: string;
  };
  payload: {
    alertTypeId: string;
    interval: number;
    actionGroups: Record<
      string,
      Array<{
        id: string;
        params: Record<string, any>;
      }>
    >;
    checkParams: Record<string, any>;
  };
}

export function updateAlertRoute(server: Hapi.Server) {
  server.route({
    method: 'PUT',
    path: '/api/alert/{id}',
    options: {
      validate: {
        options: {
          abortEarly: false,
        },
        payload: Joi.object()
          .keys({
            alertTypeId: Joi.string().required(),
            interval: Joi.number().required(),
            actionGroups: Joi.object().required(),
            checkParams: Joi.object().required(),
          })
          .required(),
      },
    },
    async handler(request: UpdateRequest) {
      const { id } = request.params;
      const alertsClient = request.getAlertsClient!();
      await alertsClient.update({ id, data: request.payload });
    },
  });
}

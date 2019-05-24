/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import Joi from 'joi';

interface ScheduleRequest extends Hapi.Request {
  payload: {
    alertId: string;
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

export function createScheduleRoute(server: Hapi.Server) {
  server.route({
    method: 'POST',
    path: '/api/alerting/schedule',
    options: {
      validate: {
        options: {
          abortEarly: false,
        },
        payload: Joi.object()
          .keys({
            alertId: Joi.string().required(),
            actionGroups: Joi.object().required(),
            checkParams: Joi.object().required(),
          })
          .required(),
      },
    },
    async handler(request: ScheduleRequest) {
      await server.plugins.alerting!.schedule(request.payload);
    },
  });
}

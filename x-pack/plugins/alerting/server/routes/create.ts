/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import Joi from 'joi';

interface ScheduleRequest extends Hapi.Request {
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

export function createAlertRoute(server: Hapi.Server) {
  server.route({
    method: 'POST',
    path: '/api/alert',
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
    async handler(request: ScheduleRequest) {
      const alertsClient = request.getAlertsClient!();
      await alertsClient.create({ data: request.payload });
    },
  });
}

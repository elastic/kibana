/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMockServer } from './_mock_server';
import { muteAlertInstanceRoute } from './mute_instance';

const { server, alertsClient } = createMockServer();
server.route(muteAlertInstanceRoute);

test('mutes an alert instance', async () => {
  const request = {
    method: 'POST',
    url: '/api/alert/1/alert_instance/2/_mute',
  };

  const { statusCode } = await server.inject(request);
  expect(statusCode).toBe(204);
  expect(alertsClient.muteInstance).toHaveBeenCalledWith({ alertId: '1', alertInstanceId: '2' });
});

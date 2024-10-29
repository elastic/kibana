/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getScheduleFrequencyRoute } from './get_schedule_frequency_route';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../../lib/license_state.mock';
import { mockHandlerArguments } from '../../../_mock_handler_arguments';
import { rulesClientMock } from '../../../../rules_client.mock';

const rulesClient = rulesClientMock.create();

jest.mock('../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('getScheduleFrequencyRoute', () => {
  it('gets the schedule frequency limit and remaining allotment', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getScheduleFrequencyRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toBe('/internal/alerting/rules/_schedule_frequency');

    expect(config).toMatchInlineSnapshot(`
      Object {
        "options": Object {
          "access": "internal",
        },
        "path": "/internal/alerting/rules/_schedule_frequency",
        "validate": Object {},
      }
    `);

    rulesClient.getScheduleFrequency.mockResolvedValueOnce({
      totalScheduledPerMinute: 9000,
      remainingSchedulesPerMinute: 1000,
    });

    const [context, req, res] = mockHandlerArguments({ rulesClient }, {}, ['ok']);

    await handler(context, req, res);

    expect(rulesClient.getScheduleFrequency).toHaveBeenCalledTimes(1);
    expect(res.ok).toHaveBeenCalledWith({
      body: {
        total_scheduled_per_minute: 9000,
        remaining_schedules_per_minute: 1000,
      },
    });
  });
});

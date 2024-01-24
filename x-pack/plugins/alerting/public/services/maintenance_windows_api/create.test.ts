/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { createMaintenanceWindow } from './create';

const http = httpServiceMock.createStartContract();

beforeEach(() => jest.resetAllMocks());

describe('createMaintenanceWindow', () => {
  test('should call create maintenance window api', async () => {
    const apiResponse = {
      title: 'test',
      duration: 1,
      r_rule: {
        dtstart: '2023-03-23T19:16:21.293Z',
        tzid: 'America/New_York',
        freq: 3,
        interval: 1,
        byweekday: ['TH'],
      },
    };
    http.post.mockResolvedValueOnce(apiResponse);

    const createParams = {
      title: 'test',
      duration: 1,
      rRule: {
        dtstart: '2023-03-23T19:16:21.293Z',
        tzid: 'America/New_York',
        freq: 3,
        interval: 1,
        byweekday: ['TH'],
      },
    };

    const result = await createMaintenanceWindow({ http, createParams });
    expect(result).toEqual(createParams);
    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/maintenance_window",
        Object {
          "body": "{\\"title\\":\\"test\\",\\"duration\\":1,\\"r_rule\\":{\\"dtstart\\":\\"2023-03-23T19:16:21.293Z\\",\\"tzid\\":\\"America/New_York\\",\\"freq\\":3,\\"interval\\":1,\\"byweekday\\":[\\"TH\\"]}}",
        },
      ]
    `);
  });
});

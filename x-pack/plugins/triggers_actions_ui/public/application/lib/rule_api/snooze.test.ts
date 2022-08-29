/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { snoozeRule } from './snooze';

const http = httpServiceMock.createStartContract();
beforeEach(() => jest.resetAllMocks());

describe('snoozeRule', () => {
  test('should call mute alert API', async () => {
    const result = await snoozeRule({
      http,
      id: '1/',
      snoozeSchedule: {
        id: null,
        duration: 864000000,
        rRule: {
          dtstart: '9999-01-01T00:00:00.000Z',
          tzid: 'UTC',
        },
      },
    });
    expect(result).toEqual(undefined);
    expect(http.post.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/internal/alerting/rule/1%2F/_snooze",
          Object {
            "body": "{\\"snooze_schedule\\":{\\"duration\\":864000000,\\"rRule\\":{\\"dtstart\\":\\"9999-01-01T00:00:00.000Z\\",\\"tzid\\":\\"UTC\\"}}}",
          },
        ],
      ]
    `);
  });
});

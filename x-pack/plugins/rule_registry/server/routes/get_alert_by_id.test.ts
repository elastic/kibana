/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_INSTANCE_ID,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_NAME,
  ALERT_RULE_PRODUCER,
  ALERT_RISK_SCORE,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_UUID,
  ECS_VERSION,
  SPACE_IDS,
  TIMESTAMP,
  VERSION,
} from '@kbn/rule-data-utils';
import { BASE_RAC_ALERTS_API_PATH } from '../../common/constants';
import { ParsedTechnicalFields } from '../../common/parse_technical_fields';
import { ParsedExperimentalFields } from '../../common/parse_experimental_fields';
import { getAlertByIdRoute } from './get_alert_by_id';
import { requestContextMock } from './__mocks__/request_context';
import { getReadRequest } from './__mocks__/request_responses';
import { requestMock, serverMock } from './__mocks__/server';

const getMockAlert = (): ParsedTechnicalFields & ParsedExperimentalFields => ({
  [ALERT_INSTANCE_ID]: 'fake-alert-id',
  [ALERT_RULE_CATEGORY]: 'apm.error_rate',
  [ALERT_RULE_CONSUMER]: 'apm',
  [ALERT_RULE_NAME]: 'Check error rate',
  [ALERT_RULE_PRODUCER]: 'apm',
  [ALERT_RISK_SCORE]: 20,
  [ALERT_RULE_TYPE_ID]: 'fake-rule-type-id',
  [ALERT_RULE_UUID]: 'fake-rule-uuid',
  [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
  [ALERT_UUID]: 'fake-alert-uuid',
  [ECS_VERSION]: '1.0.0',
  [SPACE_IDS]: ['fake-space-id'],
  [TIMESTAMP]: '2021-06-21T21:33:05.713Z',
  [VERSION]: '7.13.0',
});

describe('getAlertByIdRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(async () => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.rac.get.mockResolvedValue(getMockAlert());

    getAlertByIdRoute(server.router);
  });

  test('returns 200 when finding a single alert with valid params', async () => {
    const response = await server.inject(getReadRequest(), context);

    expect(response.status).toEqual(200);
    expect(response.body).toEqual(getMockAlert());
  });

  test('returns 200 when finding a single alert with index param', async () => {
    const response = await server.inject(
      requestMock.create({
        method: 'get',
        path: BASE_RAC_ALERTS_API_PATH,
        query: { id: 'alert-1', index: '.alerts-me' },
      }),
      context
    );

    expect(response.status).toEqual(200);
    expect(response.body).toEqual(getMockAlert());
  });

  describe('request validation', () => {
    test('rejects invalid query params', async () => {
      await expect(
        server.inject(
          requestMock.create({
            method: 'get',
            path: BASE_RAC_ALERTS_API_PATH,
            query: { id: 4 },
          }),
          context
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Request was rejected with message: 'Invalid value \\"4\\" supplied to \\"id\\"'"`
      );
    });

    test('rejects unknown query params', async () => {
      await expect(
        server.inject(
          requestMock.create({
            method: 'get',
            path: BASE_RAC_ALERTS_API_PATH,
            query: { notId: 4 },
          }),
          context
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Request was rejected with message: 'Invalid value \\"undefined\\" supplied to \\"id\\"'"`
      );
    });
  });

  test('returns error status if rac client "GET" fails', async () => {
    clients.rac.get.mockRejectedValue(new Error('Unable to get alert'));
    const response = await server.inject(getReadRequest(), context);

    expect(response.status).toEqual(500);
    expect(response.body).toEqual({
      attributes: { success: false },
      message: 'Unable to get alert',
    });
  });
});

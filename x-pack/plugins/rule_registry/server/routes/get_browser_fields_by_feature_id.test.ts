/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BASE_RAC_ALERTS_API_PATH } from '../../common/constants';
import { getBrowserFieldsByFeatureId } from './get_browser_fields_by_feature_id';
import { requestContextMock } from './__mocks__/request_context';
import { getO11yBrowserFields } from './__mocks__/request_responses';
import { requestMock, serverMock } from './__mocks__/server';

describe('getBrowserFieldsByFeatureId', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  const path = `${BASE_RAC_ALERTS_API_PATH}/browser_fields`;

  beforeEach(async () => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
  });

  describe('when racClient returns o11y indices', () => {
    beforeEach(() => {
      clients.rac.getAuthorizedAlertsIndices.mockResolvedValue([
        '.alerts-observability.logs.alerts-default',
      ]);

      getBrowserFieldsByFeatureId(server.router);
    });

    test('route registered', async () => {
      const response = await server.inject(getO11yBrowserFields(), context);

      expect(response.status).toEqual(200);
    });

    test('rejects invalid featureId type', async () => {
      await expect(
        server.inject(
          requestMock.create({
            method: 'get',
            path,
            query: { featureIds: undefined },
          }),
          context
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Request was rejected with message: 'Invalid value \\"undefined\\" supplied to \\"featureIds\\"'"`
      );
    });

    test('returns error status if rac client "getAuthorizedAlertsIndices" fails', async () => {
      clients.rac.getAuthorizedAlertsIndices.mockRejectedValue(new Error('Unable to get index'));
      const response = await server.inject(getO11yBrowserFields(), context);

      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        attributes: { success: false },
        message: 'Unable to get index',
      });
    });
  });
});

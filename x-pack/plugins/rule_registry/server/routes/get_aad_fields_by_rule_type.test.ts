/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAADFieldsByRuleType } from './get_aad_fields_by_rule_type';
import { requestContextMock } from './__mocks__/request_context';
import { getMetricThresholdAADFields } from './__mocks__/request_responses';
import { serverMock } from './__mocks__/server';

describe('getAADFieldsByRuleType', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(async () => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
  });

  describe('when racClient returns o11y indices', () => {
    beforeEach(() => {
      clients.rac.getAADFields.mockResolvedValue([
        {
          name: '_id',
          type: 'string',
          searchable: false,
          aggregatable: false,
          readFromDocValues: false,
          metadata_field: true,
          esTypes: [],
        },
      ]);

      getAADFieldsByRuleType(server.router);
    });

    test('route registered', async () => {
      const response = await server.inject(getMetricThresholdAADFields(), context);

      expect(response.status).toEqual(200);
    });

    test('returns error status if rac client "getAADFields" fails', async () => {
      clients.rac.getAADFields.mockRejectedValue(new Error('Rule type not registered'));
      const response = await server.inject(getMetricThresholdAADFields(), context);

      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        attributes: { success: false },
        message: 'Rule type not registered',
      });
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDetectionsExceptionListSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_schema.mock';

import { DETECTION_ENGINE_RULES_URL } from '../../../../../../common/constants';
import { getRuleMock, resolveRuleMock } from '../../../routes/__mocks__/request_responses';
import { requestContextMock, serverMock, requestMock } from '../../../routes/__mocks__';
import { createRuleExceptionsRoute } from './route';
import { getQueryRuleParams } from '../../../rule_schema/mocks';

const getMockExceptionItem = () => ({
  description: 'Exception item for rule default exception list',
  entries: [
    {
      field: 'some.not.nested.field',
      operator: 'included',
      type: 'match',
      value: 'some value',
    },
  ],
  name: 'Sample exception item',
  type: 'simple',
});

describe('createRuleExceptionsRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let request: ReturnType<typeof requestMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
    request = requestMock.create({
      method: 'post',
      path: `${DETECTION_ENGINE_RULES_URL}/exceptions`,
      params: {
        id: '4656dc92-5832-11ea-8e2d-0242ac130003',
      },
      body: {
        items: [getMockExceptionItem()],
      },
    });

    clients.rulesClient.resolve.mockResolvedValue(resolveRuleMock(getQueryRuleParams())); // existing rule
    clients.rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams())); // successful update
    clients.lists.exceptionListClient.createExceptionList = jest
      .fn()
      .mockResolvedValue(getDetectionsExceptionListSchemaMock());

    createRuleExceptionsRoute(server.router);
  });

  describe('happy paths', () => {
    test('returns 200 when adding an exception item and rule_default exception list already exists', async () => {
      request = requestMock.create({
        method: 'post',
        path: `${DETECTION_ENGINE_RULES_URL}/exceptions`,
        params: {
          id: '4656dc92-5832-11ea-8e2d-0242ac130003',
        },
        body: {
          items: [getMockExceptionItem()],
        },
      });

      clients.rulesClient.resolve.mockResolvedValue(
        resolveRuleMock({
          ...getQueryRuleParams(),
          exceptionsList: [
            {
              type: 'rule_default',
              id: '4656dc92-5832-11ea-8e2d-0242ac130003',
              list_id: 'my_default_list',
              namespace_type: 'single',
            },
          ],
        })
      );

      clients.lists.exceptionListClient.createExceptionList = jest.fn().mockResolvedValue({
        ...getDetectionsExceptionListSchemaMock(),
        type: 'rule_default',
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
    });
  });

  describe('500s', () => {
    test('returns 500 if no rule found', async () => {
      request = requestMock.create({
        method: 'post',
        path: `${DETECTION_ENGINE_RULES_URL}/exceptions`,
        params: {
          id: '4656dc92-5832-11ea-8e2d-0242ac130003',
        },
        body: {
          items: [getMockExceptionItem()],
        },
      });

      const result = resolveRuleMock(getQueryRuleParams());
      // @ts-expect-error
      delete result.alertTypeId;

      clients.rulesClient.resolve.mockResolvedValue(result);

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.body).toEqual({
        message:
          'Unable to add exception to rule - rule with id:"4656dc92-5832-11ea-8e2d-0242ac130003" not found',
        status_code: 500,
      });
    });

    test('returns 500 if rule found to have multiple default exception lists on it', async () => {
      request = requestMock.create({
        method: 'post',
        path: `${DETECTION_ENGINE_RULES_URL}/exceptions`,
        params: {
          id: '4656dc92-5832-11ea-8e2d-0242ac130003',
        },
        body: {
          items: [getMockExceptionItem()],
        },
      });

      clients.rulesClient.resolve.mockResolvedValue(
        resolveRuleMock({
          ...getQueryRuleParams(),
          exceptionsList: [
            {
              type: 'rule_default',
              id: '4656dc92-5832-11ea-8e2d-0242ac130003',
              list_id: 'my_default_list',
              namespace_type: 'single',
            },
            {
              type: 'rule_default',
              id: '4656dc92-5832-11ea-8e2d-0242ac130044',
              list_id: 'my_default_list_2',
              namespace_type: 'single',
            },
          ],
        })
      );

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.body).toEqual({
        message: 'More than one default exception list found on rule',
        status_code: 500,
      });
    });
  });
});

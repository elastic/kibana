/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DETECTION_ENGINE_RULES_EXCEPTIONS_REFERENCE_URL } from '../../../../../../common/constants';
import {
  getEmptyFindResult,
  getFindResultWithSingleHit,
  getRuleMock,
} from '../../../routes/__mocks__/request_responses';
import { requestContextMock, serverMock, requestMock } from '../../../routes/__mocks__';
import { findRuleExceptionReferencesRoute } from './route';
import { getQueryRuleParams } from '../../../rule_schema/mocks';
import { getExceptionListSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_schema.mock';

describe('findRuleExceptionReferencesRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  const mockList = {
    ...getExceptionListSchemaMock(),
    type: 'detection',
    id: '4656dc92-5832-11ea-8e2d-0242ac130003',
    list_id: 'my_default_list',
    namespace_type: 'single',
  };

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.rulesClient.find.mockResolvedValue({
      ...getFindResultWithSingleHit(),
      data: [
        {
          ...getRuleMock({
            ...getQueryRuleParams(),
            exceptionsList: [
              {
                type: 'detection',
                id: '4656dc92-5832-11ea-8e2d-0242ac130003',
                list_id: 'my_default_list',
                namespace_type: 'single',
              },
            ],
          }),
        },
      ],
    });

    (clients.lists.exceptionListClient.findExceptionList as jest.Mock).mockResolvedValue({
      data: [mockList],
    });

    findRuleExceptionReferencesRoute(server.router);
  });

  describe('happy paths', () => {
    test('returns 200 when adding an exception item and rule_default exception list already exists', async () => {
      const request = requestMock.create({
        method: 'get',
        path: `${DETECTION_ENGINE_RULES_EXCEPTIONS_REFERENCE_URL}?exception_list`,
        query: {
          ids: `4656dc92-5832-11ea-8e2d-0242ac130003`,
          list_ids: `my_default_list`,
          namespace_types: `single`,
        },
      });
      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        references: [
          {
            my_default_list: {
              ...mockList,
              referenced_rules: [
                {
                  exception_lists: [
                    {
                      id: '4656dc92-5832-11ea-8e2d-0242ac130003',
                      list_id: 'my_default_list',
                      namespace_type: 'single',
                      type: 'detection',
                    },
                  ],
                  id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
                  name: 'Detect Root/Admin Users',
                  rule_id: 'rule-1',
                },
              ],
            },
          },
        ],
      });
    });

    test('returns 200 when no references found', async () => {
      const request = requestMock.create({
        method: 'get',
        path: DETECTION_ENGINE_RULES_EXCEPTIONS_REFERENCE_URL,
        query: {
          ids: `4656dc92-5832-11ea-8e2d-0242ac130003`,
          list_ids: `my_default_list`,
          namespace_types: `single`,
        },
      });

      clients.rulesClient.find.mockResolvedValue(getEmptyFindResult());

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        references: [
          {
            my_default_list: {
              ...mockList,
              referenced_rules: [],
            },
          },
        ],
      });
    });
  });

  describe('error codes', () => {
    test('returns 400 if query param lengths do not match', async () => {
      const request = requestMock.create({
        method: 'get',
        path: DETECTION_ENGINE_RULES_EXCEPTIONS_REFERENCE_URL,
        query: {
          ids: `4656dc92-5832-11ea-8e2d-0242ac130003`,
          list_ids: `my_default_list`,
          namespace_types: `single,agnostic`,
        },
      });

      clients.rulesClient.find.mockResolvedValue(getEmptyFindResult());

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(400);
      expect(response.body).toEqual({
        message:
          '"ids", "list_ids" and "namespace_types" need to have the same comma separated number of values. Expected "ids" length: 1 to equal "namespace_types" length: 2 and "list_ids" length: 1.',
        status_code: 400,
      });
    });

    test('returns 500 if rules client fails', async () => {
      const request = requestMock.create({
        method: 'get',
        path: DETECTION_ENGINE_RULES_EXCEPTIONS_REFERENCE_URL,
        query: {
          ids: `4656dc92-5832-11ea-8e2d-0242ac130003`,
          list_ids: `my_default_list`,
          namespace_types: `single`,
        },
      });

      clients.rulesClient.find.mockRejectedValue(new Error('find request failed'));

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(500);
      expect(response.body).toEqual({ message: 'find request failed', status_code: 500 });
    });
  });
});

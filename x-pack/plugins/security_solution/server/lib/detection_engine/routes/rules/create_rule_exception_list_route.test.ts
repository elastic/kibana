/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DETECTION_ENGINE_URL } from '../../../../../common/constants';

import { getRuleMock, resolveRuleMock } from '../__mocks__/request_responses';
import { requestContextMock, serverMock, requestMock } from '../__mocks__';
import { createRuleExceptionListRoute } from './create_rule_exception_list_route';
import { getQueryRuleParams } from '../../schemas/rule_schemas.mock';
import {
  getDetectionsExceptionListSchemaMock,
  getExceptionListSchemaMock,
} from '@kbn/lists-plugin/common/schemas/response/exception_list_schema.mock';
import {
  getCreateExceptionListSchemaMock,
  getCreateExceptionListDetectionSchemaMock,
} from '@kbn/lists-plugin/common/schemas/request/create_exception_list_schema.mock';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';

describe('createRuleExceptionListRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let request: ReturnType<typeof requestMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
    request = requestMock.create({
      method: 'post',
      path: `${DETECTION_ENGINE_URL}/exceptions`,
      body: {
        rule_so_id: '1234',
        list_type: 'detection',
        list: getCreateExceptionListDetectionSchemaMock(),
      },
    });

    clients.rulesClient.resolve.mockResolvedValue(resolveRuleMock(getQueryRuleParams())); // existing rule
    clients.rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams())); // successful update
    clients.lists.exceptionListClient.getExceptionList = jest.fn().mockResolvedValue(null);
    clients.lists.exceptionListClient.createExceptionList = jest
      .fn()
      .mockResolvedValue(getDetectionsExceptionListSchemaMock());

    createRuleExceptionListRoute(server.router);
  });

  describe('happy paths', () => {
    test('returns 200 when adding a detection exception list', async () => {
      const response = await server.inject(request, requestContextMock.convertContext(context));
      const {
        _version,
        created_at: createdAt,
        tie_breaker_id: tieBreakerId,
        updated_at: updatedAt,
        ...restOfList
      } = response.body;

      expect(response.status).toEqual(200);
      expect(restOfList).toEqual({
        created_by: 'some user',
        description: 'some description',
        id: '1',
        immutable: false,
        list_id: 'exception_list_id',
        meta: {},
        name: 'Sample Exception List',
        namespace_type: 'single',
        os_types: ['linux'],
        tags: ['user added string for a tag', 'malware'],
        type: 'detection',
        updated_by: 'user_name',
        version: 1,
      });
    });

    test('returns 200 when adding a rule_default exception list', async () => {
      request = requestMock.create({
        method: 'post',
        path: `${DETECTION_ENGINE_URL}/exceptions`,
        body: {
          rule_so_id: '1234',
          list_type: 'rule_default',
          list: {
            ...getCreateExceptionListDetectionSchemaMock(),
            type: 'rule_default',
          },
        },
      });

      clients.lists.exceptionListClient.createExceptionList = jest.fn().mockResolvedValue({
        ...getDetectionsExceptionListSchemaMock(),
        type: 'rule_default',
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));
      const {
        _version,
        created_at: createdAt,
        tie_breaker_id: tieBreakerId,
        updated_at: updatedAt,
        ...restOfList
      } = response.body;

      expect(response.status).toEqual(200);
      expect(restOfList).toEqual({
        created_by: 'some user',
        description: 'some description',
        id: '1',
        immutable: false,
        list_id: 'exception_list_id',
        meta: {},
        name: 'Sample Exception List',
        namespace_type: 'single',
        os_types: ['linux'],
        tags: ['user added string for a tag', 'malware'],
        type: 'rule_default',
        updated_by: 'user_name',
        version: 1,
      });
    });

    test('returns 200 when adding an endpoint list', async () => {
      request = requestMock.create({
        method: 'post',
        path: `${DETECTION_ENGINE_URL}/exceptions`,
        body: {
          rule_so_id: '1234',
          list_type: 'endpoint',
        },
      });

      clients.lists.exceptionListClient.createExceptionList = jest
        .fn()
        .mockResolvedValue(getExceptionListSchemaMock());

      const response = await server.inject(request, requestContextMock.convertContext(context));
      const {
        _version,
        created_at: createdAt,
        tie_breaker_id: tieBreakerId,
        updated_at: updatedAt,
        ...restOfList
      } = response.body;

      expect(response.status).toEqual(200);
      expect(restOfList).toEqual({
        created_by: 'some user',
        description: 'some description',
        id: '1',
        immutable: false,
        list_id: 'endpoint_list',
        meta: {},
        name: 'Sample Endpoint Exception List',
        namespace_type: 'agnostic',
        os_types: ['linux'],
        tags: ['user added string for a tag', 'malware'],
        type: 'endpoint',
        updated_by: 'user_name',
        version: 1,
      });
    });
  });

  describe('500s', () => {
    test('returns 500 if no rule found', async () => {
      request = requestMock.create({
        method: 'post',
        path: `${DETECTION_ENGINE_URL}/exceptions`,
        body: {
          rule_so_id: '1234',
          list_type: 'detection',
          list: getCreateExceptionListDetectionSchemaMock(),
        },
      });

      const result = resolveRuleMock(getQueryRuleParams());
      // @ts-expect-error
      delete result.alertTypeId;

      clients.rulesClient.resolve.mockResolvedValue(result);

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Unable to add exception list to rule - rule with id:"1234" not found',
        status_code: 500,
      });
    });
  });

  describe('400s', () => {
    test('returns 409 if list type is "endpoint" and list already exists', async () => {
      request = requestMock.create({
        method: 'post',
        path: `${DETECTION_ENGINE_URL}/exceptions`,
        body: {
          rule_so_id: '1234',
          list_type: 'endpoint',
        },
      });

      clients.lists.exceptionListClient.getExceptionList = jest
        .fn()
        .mockResolvedValue(getExceptionListSchemaMock());

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(409);
      expect(response.body).toEqual({
        message: '"endpoint" exception list already exists',
        status_code: 409,
      });
    });

    test('returns 409 if list type is not "endpoint" and list already exists', async () => {
      request = requestMock.create({
        method: 'post',
        path: `${DETECTION_ENGINE_URL}/exceptions`,
        body: {
          rule_so_id: '1234',
          list_type: 'detection',
          list: getCreateExceptionListDetectionSchemaMock(),
        },
      });

      clients.lists.exceptionListClient.getExceptionList = jest
        .fn()
        .mockResolvedValue(getDetectionsExceptionListSchemaMock());

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(409);
      expect(response.body).toEqual({
        message: 'exception list id: "some-list-id" already exists',
        status_code: 409,
      });
    });

    test('returns 409 if trying to add an exception list of "rule_default" if one already exists on the rule', async () => {
      request = requestMock.create({
        method: 'post',
        path: `${DETECTION_ENGINE_URL}/exceptions`,
        body: {
          rule_so_id: '1234',
          list_type: 'rule_default',
          list: { ...getCreateExceptionListDetectionSchemaMock(), type: 'rule_default' },
        },
      });

      clients.rulesClient.resolve.mockResolvedValue(
        resolveRuleMock({
          ...getQueryRuleParams(),
          exceptionsList: [
            {
              type: 'rule_default',
              id: '1234',
              list_id: 'my_default_list',
              namespace_type: 'single',
            },
          ],
        })
      );

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(409);
      expect(response.body).toEqual({
        message: 'Rule already contains a default exception list.',
        status_code: 409,
      });
    });

    test('returns 400 if trying to create an endpoint list', async () => {
      request = requestMock.create({
        method: 'post',
        path: `${DETECTION_ENGINE_URL}/exceptions`,
        body: {
          rule_so_id: '1234',
          list_type: 'endpoint',
          list: getCreateExceptionListSchemaMock(),
        },
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(400);
      expect(response.body).toEqual({
        message: [
          'exception list "type" of "endpoint" is created by the system, cannot specify list properties',
        ],
        status_code: 400,
      });
    });

    test('returns 400 if "list_type" does not match list being created', async () => {
      request = requestMock.create({
        method: 'post',
        path: `${DETECTION_ENGINE_URL}/exceptions`,
        body: {
          rule_so_id: '1234',
          list_type: 'rule_default',
          list: getCreateExceptionListDetectionSchemaMock(),
        },
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(400);
      expect(response.body).toEqual({
        message: ['"list_type" must match "type" property on "list"'],
        status_code: 400,
      });
    });

    test('returns 400 if "list_type" is not "endpoint" and no list to create is specified', async () => {
      request = requestMock.create({
        method: 'post',
        path: `${DETECTION_ENGINE_URL}/exceptions`,
        body: {
          rule_so_id: '1234',
          list_type: 'rule_default',
        },
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(400);
      expect(response.body).toEqual({
        message: ['exception list "type" of "rule_default" is missing "list" property'],
        status_code: 400,
      });
    });

    test('returns 400 if "list_type" is not one of the allowed rule exception list types', async () => {
      request = requestMock.create({
        method: 'post',
        path: `${DETECTION_ENGINE_URL}/exceptions`,
        body: {
          rule_so_id: '1234',
          list_type: ExceptionListTypeEnum.ENDPOINT_BLOCKLISTS,
          list: {
            ...getCreateExceptionListDetectionSchemaMock(),
            type: ExceptionListTypeEnum.ENDPOINT_BLOCKLISTS,
          },
        },
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(400);
      expect(response.body).toEqual({
        message: ['exception list "type" of "endpoint_blocklists", cannot be added to a rule'],
        status_code: 400,
      });
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';

import { routeDefinitionParamsMock } from '../index.mock';
import { defineGetFieldsRoutes } from './get_fields';

const createFieldMapping = (field: string, type: string) => ({
  [field]: { mapping: { [field]: { type } } },
});

const createEmptyFieldMapping = (field: string) => ({ [field]: { mapping: {} } });

const mockFieldMappingResponse = {
  foo: {
    mappings: {
      ...createFieldMapping('fooField', 'keyword'),
      ...createFieldMapping('commonField', 'keyword'),
      ...createEmptyFieldMapping('emptyField'),
    },
  },
  bar: {
    mappings: {
      ...createFieldMapping('commonField', 'keyword'),
      ...createFieldMapping('barField', 'keyword'),
      ...createFieldMapping('runtimeField', 'runtime'),
    },
  },
};

describe('GET /internal/security/fields/{query}', () => {
  it('returns a list of deduplicated fields, omitting empty and runtime fields', async () => {
    const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
    const mockContext = {
      core: coreMock.createRequestHandlerContext(),
    };
    mockContext.core.elasticsearch.client.asCurrentUser.indices.getFieldMapping.mockResponse(
      mockFieldMappingResponse as any
    );

    defineGetFieldsRoutes(mockRouteDefinitionParams);

    const [[, handler]] = mockRouteDefinitionParams.router.get.mock.calls;

    const headers = { authorization: 'foo' };
    const mockRequest = httpServerMock.createKibanaRequest({
      method: 'get',
      path: `/internal/security/fields/foo`,
      headers,
    });
    const response = await handler(mockContext as any, mockRequest, kibanaResponseFactory);
    expect(response.status).toBe(200);
    expect(response.payload).toEqual(['fooField', 'commonField', 'barField']);
  });
});

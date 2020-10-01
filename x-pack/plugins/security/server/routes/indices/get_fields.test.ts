/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { httpServerMock, elasticsearchServiceMock } from '../../../../../../src/core/server/mocks';
import { kibanaResponseFactory } from '../../../../../../src/core/server';

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

    const scopedClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
    scopedClient.callAsCurrentUser.mockResolvedValue(mockFieldMappingResponse);
    mockRouteDefinitionParams.clusterClient.asScoped.mockReturnValue(scopedClient);

    defineGetFieldsRoutes(mockRouteDefinitionParams);

    const [[, handler]] = mockRouteDefinitionParams.router.get.mock.calls;

    const headers = { authorization: 'foo' };
    const mockRequest = httpServerMock.createKibanaRequest({
      method: 'get',
      path: `/internal/security/fields/foo`,
      headers,
    });
    const response = await handler({} as any, mockRequest, kibanaResponseFactory);
    expect(response.status).toBe(200);
    expect(response.payload).toEqual(['fooField', 'commonField', 'barField']);
  });
});

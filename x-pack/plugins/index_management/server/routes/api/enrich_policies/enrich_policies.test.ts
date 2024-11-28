/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addInternalBasePath } from '..';
import { RouterMock, routeDependencies, RequestMock } from '../../../test/helpers';
import { serializeEnrichmentPolicies } from '../../../lib/enrich_policies';
import { createTestESEnrichPolicy } from '../../../test/helpers';

import { registerEnrichPoliciesRoute } from './register_enrich_policies_routes';

const mockedPolicy = createTestESEnrichPolicy('my-policy', 'match');

describe('Enrich policies API', () => {
  const router = new RouterMock();

  beforeEach(() => {
    registerEnrichPoliciesRoute({
      ...routeDependencies,
      router,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Get all policies - GET /internal/index_management/enrich_policies', () => {
    const getEnrichPolicies = router.getMockESApiFn('enrich.getPolicy');

    it('returns all available policies', async () => {
      const mockRequest: RequestMock = {
        method: 'get',
        path: addInternalBasePath('/enrich_policies'),
      };

      getEnrichPolicies.mockResolvedValue({ policies: [mockedPolicy] });

      const res = await router.runRequest(mockRequest);

      expect(res).toEqual({
        body: serializeEnrichmentPolicies([mockedPolicy]),
      });
    });

    it('should return an error if it fails', async () => {
      const mockRequest: RequestMock = {
        method: 'get',
        path: addInternalBasePath('/enrich_policies'),
      };

      const error = new Error('Oh no!');
      getEnrichPolicies.mockRejectedValue(error);

      await expect(router.runRequest(mockRequest)).rejects.toThrowError(error);
    });
  });

  describe('Execute policy - PUT /api/index_management/enrich_policies/{policy}', () => {
    const executeEnrichPolicy = router.getMockESApiFn('enrich.executePolicy');

    it('correctly executes a policy', async () => {
      const mockRequest: RequestMock = {
        method: 'put',
        path: addInternalBasePath('/enrich_policies/{name}'),
        params: {
          name: 'my-policy',
        },
      };

      executeEnrichPolicy.mockResolvedValue({ status: { phase: 'COMPLETE' } });

      const res = await router.runRequest(mockRequest);

      expect(res).toEqual({
        body: { status: { phase: 'COMPLETE' } },
      });
    });

    it('should return an error if it fails', async () => {
      const mockRequest: RequestMock = {
        method: 'put',
        path: addInternalBasePath('/enrich_policies/{name}'),
        params: {
          name: 'my-policy',
        },
      };

      const error = new Error('Oh no!');
      executeEnrichPolicy.mockRejectedValue(error);

      await expect(router.runRequest(mockRequest)).rejects.toThrowError(error);
    });
  });

  describe('Delete policy - DELETE /api/index_management/enrich_policies/{policy}', () => {
    const deleteEnrichPolicy = router.getMockESApiFn('enrich.deletePolicy');

    it('correctly deletes a policy', async () => {
      const mockRequest: RequestMock = {
        method: 'delete',
        path: addInternalBasePath('/enrich_policies/{name}'),
        params: {
          name: 'my-policy',
        },
      };

      deleteEnrichPolicy.mockResolvedValue({ status: { phase: 'COMPLETE' } });

      const res = await router.runRequest(mockRequest);

      expect(res).toEqual({
        body: { status: { phase: 'COMPLETE' } },
      });
    });

    it('should return an error if it fails', async () => {
      const mockRequest: RequestMock = {
        method: 'delete',
        path: addInternalBasePath('/enrich_policies/{name}'),
        params: {
          name: 'my-policy',
        },
      };

      const error = new Error('Oh no!');
      deleteEnrichPolicy.mockRejectedValue(error);

      await expect(router.runRequest(mockRequest)).rejects.toThrowError(error);
    });
  });

  describe('Create policy - POST /api/index_management/enrich_policies', () => {
    const createPolicyMock = router.getMockESApiFn('enrich.putPolicy');
    const executePolicyMock = router.getMockESApiFn('enrich.executePolicy');
    const deletePolicyMock = router.getMockESApiFn('enrich.deletePolicy');

    it('correctly creates a policy', async () => {
      const mockRequest: RequestMock = {
        method: 'post',
        path: addInternalBasePath('/enrich_policies'),
        body: {
          policy: {
            name: 'my-policy',
            type: 'match',
            matchField: 'my_field',
            enrichFields: ['field_1', 'field_2'],
            sourceIndex: ['index_1'],
          },
        },
      };

      createPolicyMock.mockResolvedValue({ status: { status: 'OK' } });

      const res = await router.runRequest(mockRequest);

      expect(res).toEqual({
        body: { status: { status: 'OK' } },
      });

      expect(executePolicyMock).not.toHaveBeenCalled();
    });

    it('can create a policy and execute it', async () => {
      const mockRequest: RequestMock = {
        method: 'post',
        path: addInternalBasePath('/enrich_policies'),
        query: {
          executePolicyAfterCreation: true,
        },
        body: {
          policy: {
            name: 'my-policy',
            type: 'match',
            matchField: 'my_field',
            enrichFields: ['field_1', 'field_2'],
            sourceIndex: ['index_1'],
          },
        },
      };

      createPolicyMock.mockResolvedValue({ status: { status: 'OK' } });
      executePolicyMock.mockResolvedValue({ status: { status: 'OK' } });

      const res = await router.runRequest(mockRequest);

      expect(res).toEqual({
        body: { status: { status: 'OK' } },
      });

      expect(executePolicyMock).toHaveBeenCalled();
    });

    it('if when creating policy and executing the execution fails, the policy should be removed', async () => {
      const mockRequest: RequestMock = {
        method: 'post',
        path: addInternalBasePath('/enrich_policies'),
        query: {
          executePolicyAfterCreation: true,
        },
        body: {
          policy: {
            name: 'my-policy',
            type: 'match',
            matchField: 'my_field',
            enrichFields: ['field_1', 'field_2'],
            sourceIndex: ['index_1'],
          },
        },
      };

      createPolicyMock.mockResolvedValue({ status: { status: 'OK' } });
      const executeError = new Error('Oh no!');
      executePolicyMock.mockRejectedValue(executeError);
      deletePolicyMock.mockResolvedValue({ status: { status: 'OK' } });

      // Expect the API to fail and the policy to be deleted
      await expect(router.runRequest(mockRequest)).rejects.toThrowError(executeError);
      expect(deletePolicyMock).toHaveBeenCalled();
    });

    it('should return an error if it fails', async () => {
      const mockRequest: RequestMock = {
        method: 'post',
        path: addInternalBasePath('/enrich_policies'),
        body: {
          policy: {
            name: 'my-policy',
            type: 'match',
            matchField: 'my_field',
            enrichFields: ['field_1', 'field_2'],
            sourceIndex: ['index_1'],
          },
        },
      };

      const error = new Error('Oh no!');
      createPolicyMock.mockRejectedValue(error);

      await expect(router.runRequest(mockRequest)).rejects.toThrowError(error);
    });
  });

  describe('Fields from indices - POST /api/index_management/enrich_policies/get_fields_from_indices', () => {
    const fieldCapsMock = router.getMockESApiFn('fieldCaps');

    it('correctly returns fields and common fields for the selected indices', async () => {
      const mockRequest: RequestMock = {
        method: 'post',
        path: addInternalBasePath('/enrich_policies/get_fields_from_indices'),
        body: {
          indices: ['test-a', 'test-b'],
        },
      };

      fieldCapsMock.mockResolvedValue({
        body: {
          indices: ['test-a'],
          fields: {
            name: { text: { type: 'text' } },
          },
        },
        statusCode: 200,
      });

      const res = await router.runRequest(mockRequest);

      expect(res).toEqual({
        body: {
          indices: [
            {
              index: 'test-a',
              fields: [{ name: 'name', type: 'text', normalizedType: 'text' }],
            },
            {
              index: 'test-b',
              fields: [{ name: 'name', type: 'text', normalizedType: 'text' }],
            },
          ],
          commonFields: [{ name: 'name', type: 'text', normalizedType: 'text' }],
        },
      });

      expect(fieldCapsMock).toHaveBeenCalled();
    });

    it('should return an error if it fails', async () => {
      const mockRequest: RequestMock = {
        method: 'post',
        path: addInternalBasePath('/enrich_policies/get_fields_from_indices'),
        body: {
          indices: ['test-a'],
        },
      };

      const error = new Error('Oh no!');
      fieldCapsMock.mockRejectedValue(error);

      await expect(router.runRequest(mockRequest)).rejects.toThrowError(error);
    });
  });

  describe('Get matching indices - POST /api/index_management/enrich_policies/get_matching_indices', () => {
    const getAliasMock = router.getMockESApiFn('indices.getAlias');
    const searchMock = router.getMockESApiFn('search');

    it('Return matching indices using alias api', async () => {
      const mockRequest: RequestMock = {
        method: 'post',
        path: addInternalBasePath('/enrich_policies/get_matching_indices'),
        body: {
          pattern: 'test',
        },
      };

      getAliasMock.mockResolvedValue({
        body: {},
        statusCode: 200,
      });

      const res = await router.runRequest(mockRequest);

      expect(res).toEqual({
        body: {
          indices: [],
        },
      });

      expect(searchMock).not.toHaveBeenCalled();
      expect(getAliasMock).toHaveBeenCalledWith(
        { index: '*test*', expand_wildcards: 'open' },
        { ignore: [404], meta: true }
      );
    });

    it('When alias api fails or returns nothing it fallsback to search api', async () => {
      const mockRequest: RequestMock = {
        method: 'post',
        path: addInternalBasePath('/enrich_policies/get_matching_indices'),
        body: {
          pattern: 'test',
        },
      };

      getAliasMock.mockResolvedValue({
        body: {},
        statusCode: 404,
      });

      searchMock.mockResolvedValue({
        body: {},
        statusCode: 404,
      });

      const res = await router.runRequest(mockRequest);

      expect(res).toEqual({
        body: {
          indices: [],
        },
      });

      expect(searchMock).toHaveBeenCalled();
    });
  });

  describe('Get matching indices - POST /api/index_management/enrich_policies/get_matching_data_streams', () => {
    const getDataStreamsMock = router.getMockESApiFn('indices.getDataStream');

    it('Return matching data streams', async () => {
      const mockRequest: RequestMock = {
        method: 'post',
        path: addInternalBasePath('/enrich_policies/get_matching_data_streams'),
        body: {
          pattern: 'test',
        },
      };

      getDataStreamsMock.mockResolvedValue({
        body: {},
        statusCode: 200,
      });

      const res = await router.runRequest(mockRequest);

      expect(res).toEqual({
        body: {
          dataStreams: [],
        },
      });

      expect(getDataStreamsMock).toHaveBeenCalledWith({ name: '*test*', expand_wildcards: 'open' });
    });
  });
});

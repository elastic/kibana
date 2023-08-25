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

    it('correctly creates a policy', async () => {
      const mockRequest: RequestMock = {
        method: 'post',
        path: addInternalBasePath('/enrich_policies'),
        body: {
          name: 'my-policy',
          type: 'match',
          matchField: 'my_field',
          enrichFields: ['field_1', 'field_2'],
          sourceIndex: ['index_1'],
        },
      };

      createPolicyMock.mockResolvedValue({ status: { status: 'OK' } });

      const res = await router.runRequest(mockRequest);

      expect(res).toEqual({
        body: { status: { status: 'OK' } },
      });
    });

    it('should return an error if it fails', async () => {
      const mockRequest: RequestMock = {
        method: 'post',
        path: addInternalBasePath('/enrich_policies'),
        body: {
          name: 'my-policy',
          type: 'match',
          matchField: 'my_field',
          enrichFields: ['field_1', 'field_2'],
          sourceIndex: ['index_1'],
        },
      };

      const error = new Error('Oh no!');
      createPolicyMock.mockRejectedValue(error);

      await expect(router.runRequest(mockRequest)).rejects.toThrowError(error);
    });
  });
});

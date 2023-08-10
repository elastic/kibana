/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addBasePath } from '..';
import { RouterMock, routeDependencies, RequestMock } from '../../../test/helpers';

import { registerEnrichPoliciesRoute } from './register_enrich_policies_routes';

const mockedPolicy = {
  config: {
    match: {
      name: 'my-policy',
      indices: ['users'],
      match_field: 'email',
      enrich_fields: ['first_name', 'last_name', 'city', 'zip', 'state'],
    },
  },
};

/**
 * Since these route callbacks are so thin, these serve simply as integration tests
 * to ensure they're wired up to the lib functions correctly. Business logic is tested
 * more thoroughly in the es_deprecation_logging_apis test.
 */
describe('deprecation logging API', () => {
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

  describe('Get all policies - GET /api/index_management/enrich_policies', () => {
    const getEnrichPolicies = router.getMockESApiFn('enrich.getPolicy');

    it('returns all available policies', async () => {
      const mockRequest: RequestMock = {
        method: 'get',
        path: addBasePath('/enrich_policies'),
      };

      getEnrichPolicies.mockResolvedValue({ policies: [mockedPolicy] });

      const res = await router.runRequest(mockRequest);

      expect(res).toEqual({
        body: { policies: [mockedPolicy] },
      });
    });

    it('should return an error if it fails', async () => {
      const mockRequest: RequestMock = {
        method: 'get',
        path: addBasePath('/enrich_policies'),
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
        path: addBasePath('/enrich_policies/{name}'),
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
        path: addBasePath('/enrich_policies/{name}'),
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
        path: addBasePath('/enrich_policies/{name}'),
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
        path: addBasePath('/enrich_policies/{name}'),
        params: {
          name: 'my-policy',
        },
      };

      const error = new Error('Oh no!');
      deleteEnrichPolicy.mockRejectedValue(error);

      await expect(router.runRequest(mockRequest)).rejects.toThrowError(error);
    });
  });
});

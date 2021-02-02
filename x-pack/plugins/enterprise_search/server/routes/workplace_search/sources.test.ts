/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MockRouter, mockRequestHandler, mockDependencies } from '../../__mocks__';

import {
  registerAccountSourcesRoute,
  registerAccountSourcesStatusRoute,
  registerAccountSourceRoute,
  registerAccountCreateSourceRoute,
  registerAccountSourceDocumentsRoute,
  registerAccountSourceFederatedSummaryRoute,
  registerAccountSourceReauthPrepareRoute,
  registerAccountSourceSettingsRoute,
  registerAccountPreSourceRoute,
  registerAccountPrepareSourcesRoute,
  registerAccountSourceSearchableRoute,
  registerAccountSourceDisplaySettingsConfig,
  registerAccountSourceSchemasRoute,
  registerAccountSourceReindexJobRoute,
  registerAccountSourceReindexJobStatusRoute,
  registerOrgSourcesRoute,
  registerOrgSourcesStatusRoute,
  registerOrgSourceRoute,
  registerOrgCreateSourceRoute,
  registerOrgSourceDocumentsRoute,
  registerOrgSourceFederatedSummaryRoute,
  registerOrgSourceReauthPrepareRoute,
  registerOrgSourceSettingsRoute,
  registerOrgPreSourceRoute,
  registerOrgPrepareSourcesRoute,
  registerOrgSourceSearchableRoute,
  registerOrgSourceDisplaySettingsConfig,
  registerOrgSourceSchemasRoute,
  registerOrgSourceReindexJobRoute,
  registerOrgSourceReindexJobStatusRoute,
  registerOrgSourceOauthConfigurationsRoute,
  registerOrgSourceOauthConfigurationRoute,
} from './sources';

const mockConfig = {
  base_url: 'http://search',
  client_id: 'asd',
  client_secret: '234KKDFksdf22',
  service_type: 'zendesk',
  private_key: 'gsdfgsdfg',
  public_key: 'gadfgsdfgss',
  consumer_key: 'sf44argsr',
};

describe('sources routes', () => {
  describe('GET /api/workplace_search/account/sources', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/account/sources',
      });

      registerAccountSourcesRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/sources',
      });
    });
  });

  describe('GET /api/workplace_search/account/sources/status', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/account/sources/status',
      });

      registerAccountSourcesStatusRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/sources/status',
      });
    });
  });

  describe('GET /api/workplace_search/account/sources/{id}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/account/sources/{id}',
      });

      registerAccountSourceRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/sources/:id',
      });
    });
  });

  describe('DELETE /api/workplace_search/account/sources/{id}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'delete',
        path: '/api/workplace_search/account/sources/{id}',
      });

      registerAccountSourceRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/sources/:id',
      });
    });
  });

  describe('POST /api/workplace_search/account/create_source', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/api/workplace_search/account/create_source',
        payload: 'body',
      });

      registerAccountCreateSourceRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/sources/form_create',
      });
    });

    describe('validates', () => {
      it('correctly', () => {
        const request = {
          body: {
            service_type: 'google',
            name: 'Google',
            login: 'user',
            password: 'changeme',
            organizations: ['swiftype'],
            indexPermissions: true,
          },
        };
        mockRouter.shouldValidate(request);
      });
    });
  });

  describe('POST /api/workplace_search/account/sources/{id}/documents', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/api/workplace_search/account/sources/{id}/documents',
        payload: 'body',
      });

      registerAccountSourceDocumentsRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/sources/:id/documents',
      });
    });

    describe('validates', () => {
      it('correctly', () => {
        const request = {
          body: {
            query: 'foo',
            page: {
              current: 1,
              size: 10,
              total_pages: 1,
              total_results: 10,
            },
          },
        };
        mockRouter.shouldValidate(request);
      });
    });
  });

  describe('GET /api/workplace_search/account/sources/{id}/federated_summary', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/account/sources/{id}/federated_summary',
      });

      registerAccountSourceFederatedSummaryRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/sources/:id/federated_summary',
      });
    });
  });

  describe('GET /api/workplace_search/account/sources/{id}/reauth_prepare', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/account/sources/{id}/reauth_prepare',
      });

      registerAccountSourceReauthPrepareRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/sources/:id/reauth_prepare',
      });
    });
  });

  describe('PATCH /api/workplace_search/account/sources/{id}/settings', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'patch',
        path: '/api/workplace_search/account/sources/{id}/settings',
        payload: 'body',
      });

      registerAccountSourceSettingsRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/sources/:id/settings',
      });
    });

    describe('validates', () => {
      it('correctly', () => {
        const request = {
          body: {
            content_source: {
              name: 'foo',
            },
          },
        };
        mockRouter.shouldValidate(request);
      });
    });
  });

  describe('GET /api/workplace_search/account/pre_sources/{id}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/account/pre_sources/{id}',
      });

      registerAccountPreSourceRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/pre_content_sources/:id',
      });
    });
  });

  describe('GET /api/workplace_search/account/sources/{serviceType}/prepare', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/account/sources/{serviceType}/prepare',
      });

      registerAccountPrepareSourcesRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/sources/:serviceType/prepare',
      });
    });
  });

  describe('PUT /api/workplace_search/account/sources/{id}/searchable', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'put',
        path: '/api/workplace_search/account/sources/{id}/searchable',
        payload: 'body',
      });

      registerAccountSourceSearchableRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/sources/:id/searchable',
      });
    });

    describe('validates', () => {
      it('correctly', () => {
        const request = {
          body: {
            searchable: true,
          },
        };
        mockRouter.shouldValidate(request);
      });
    });
  });

  describe('GET /api/workplace_search/account/sources/{id}/display_settings/config', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/account/sources/{id}/display_settings/config',
      });

      registerAccountSourceDisplaySettingsConfig({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/sources/:id/display_settings/config',
      });
    });
  });

  describe('POST /api/workplace_search/account/sources/{id}/display_settings/config', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/api/workplace_search/account/sources/{id}/display_settings/config',
        payload: 'body',
      });

      registerAccountSourceDisplaySettingsConfig({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/sources/:id/display_settings/config',
      });
    });

    describe('validates', () => {
      it('correctly', () => {
        const request = {
          body: {
            titleField: 'foo',
            subtitleField: 'bar',
            descriptionField: 'this is a thing',
            urlField: 'http://youknowfor.search',
            urlFieldIsLinkable: true,
            color: '#aaa',
            detailFields: {
              fieldName: 'myField',
              label: 'My Field',
            },
          },
        };
        mockRouter.shouldValidate(request);
      });
    });
  });

  describe('GET /api/workplace_search/account/sources/{id}/schemas', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/account/sources/{id}/schemas',
      });

      registerAccountSourceSchemasRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/sources/:id/schemas',
      });
    });
  });

  describe('POST /api/workplace_search/account/sources/{id}/schemas', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/api/workplace_search/account/sources/{id}/schemas',
        payload: 'body',
      });

      registerAccountSourceSchemasRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/sources/:id/schemas',
      });
    });

    describe('validates', () => {
      it('correctly', () => {
        const request = { body: { someSchemaKey: 'text' } };
        mockRouter.shouldValidate(request);
      });
    });
  });

  describe('GET /api/workplace_search/account/sources/{sourceId}/reindex_job/{jobId}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/account/sources/{sourceId}/reindex_job/{jobId}',
      });

      registerAccountSourceReindexJobRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      const mockRequest = {
        params: {
          sourceId: '123',
          jobId: '345',
        },
      };

      mockRouter.callRoute(mockRequest);

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/sources/:sourceId/reindex_job/:jobId',
      });
    });
  });

  describe('GET /api/workplace_search/account/sources/{sourceId}/reindex_job/{jobId}/status', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/account/sources/{sourceId}/reindex_job/{jobId}/status',
      });

      registerAccountSourceReindexJobStatusRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/sources/:sourceId/reindex_job/:jobId/status',
      });
    });
  });

  describe('GET /api/workplace_search/org/sources', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/org/sources',
      });

      registerOrgSourcesRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/sources',
      });
    });
  });

  describe('GET /api/workplace_search/org/sources/status', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/org/sources/status',
      });

      registerOrgSourcesStatusRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/sources/status',
      });
    });
  });

  describe('GET /api/workplace_search/org/sources/{id}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/org/sources/{id}',
      });

      registerOrgSourceRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/sources/:id',
      });
    });
  });

  describe('DELETE /api/workplace_search/org/sources/{id}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'delete',
        path: '/api/workplace_search/org/sources/{id}',
      });

      registerOrgSourceRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/sources/:id',
      });
    });
  });

  describe('POST /api/workplace_search/org/create_source', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/api/workplace_search/org/create_source',
        payload: 'body',
      });

      registerOrgCreateSourceRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/sources/form_create',
      });
    });

    describe('validates', () => {
      it('correctly', () => {
        const request = {
          body: {
            service_type: 'google',
            name: 'Google',
            login: 'user',
            password: 'changeme',
            organizations: ['swiftype'],
            indexPermissions: true,
          },
        };
        mockRouter.shouldValidate(request);
      });
    });
  });

  describe('POST /api/workplace_search/org/sources/{id}/documents', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/api/workplace_search/org/sources/{id}/documents',
        payload: 'body',
      });

      registerOrgSourceDocumentsRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/sources/:id/documents',
      });
    });

    describe('validates', () => {
      it('correctly', () => {
        const request = {
          body: {
            query: 'foo',
            page: {
              current: 1,
              size: 10,
              total_pages: 1,
              total_results: 10,
            },
          },
        };
        mockRouter.shouldValidate(request);
      });
    });
  });

  describe('GET /api/workplace_search/org/sources/{id}/federated_summary', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/org/sources/{id}/federated_summary',
      });

      registerOrgSourceFederatedSummaryRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/sources/:id/federated_summary',
      });
    });
  });

  describe('GET /api/workplace_search/org/sources/{id}/reauth_prepare', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/org/sources/{id}/reauth_prepare',
      });

      registerOrgSourceReauthPrepareRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/sources/:id/reauth_prepare',
      });
    });
  });

  describe('PATCH /api/workplace_search/org/sources/{id}/settings', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'patch',
        path: '/api/workplace_search/org/sources/{id}/settings',
        payload: 'body',
      });

      registerOrgSourceSettingsRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/sources/:id/settings',
      });
    });

    describe('validates', () => {
      it('correctly', () => {
        const request = {
          body: {
            content_source: {
              name: 'foo',
            },
          },
        };
        mockRouter.shouldValidate(request);
      });
    });
  });

  describe('GET /api/workplace_search/org/pre_sources/{id}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/org/pre_sources/{id}',
      });

      registerOrgPreSourceRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/pre_content_sources/:id',
      });
    });
  });

  describe('GET /api/workplace_search/org/sources/{serviceType}/prepare', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/org/sources/{serviceType}/prepare',
      });

      registerOrgPrepareSourcesRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/sources/:serviceType/prepare',
      });
    });
  });

  describe('PUT /api/workplace_search/org/sources/{id}/searchable', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'put',
        path: '/api/workplace_search/org/sources/{id}/searchable',
        payload: 'body',
      });

      registerOrgSourceSearchableRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/sources/:id/searchable',
      });
    });

    describe('validates', () => {
      it('correctly', () => {
        const request = {
          body: {
            searchable: true,
          },
        };
        mockRouter.shouldValidate(request);
      });
    });
  });

  describe('GET /api/workplace_search/org/sources/{id}/display_settings/config', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/org/sources/{id}/display_settings/config',
      });

      registerOrgSourceDisplaySettingsConfig({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/sources/:id/display_settings/config',
      });
    });
  });

  describe('POST /api/workplace_search/org/sources/{id}/display_settings/config', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/api/workplace_search/org/sources/{id}/display_settings/config',
        payload: 'body',
      });

      registerOrgSourceDisplaySettingsConfig({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/sources/:id/display_settings/config',
      });
    });

    describe('validates', () => {
      it('correctly', () => {
        const request = {
          body: {
            titleField: 'foo',
            subtitleField: 'bar',
            descriptionField: 'this is a thing',
            urlField: 'http://youknowfor.search',
            urlFieldIsLinkable: true,
            color: '#aaa',
            detailFields: {
              fieldName: 'myField',
              label: 'My Field',
            },
          },
        };
        mockRouter.shouldValidate(request);
      });
    });
  });

  describe('GET /api/workplace_search/org/sources/{id}/schemas', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/org/sources/{id}/schemas',
      });

      registerOrgSourceSchemasRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/sources/:id/schemas',
      });
    });
  });

  describe('POST /api/workplace_search/org/sources/{id}/schemas', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/api/workplace_search/org/sources/{id}/schemas',
        payload: 'body',
      });

      registerOrgSourceSchemasRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/sources/:id/schemas',
      });
    });

    describe('validates', () => {
      it('correctly', () => {
        const request = { body: { someSchemaKey: 'number' } };
        mockRouter.shouldValidate(request);
      });
    });
  });

  describe('GET /api/workplace_search/org/sources/{sourceId}/reindex_job/{jobId}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/org/sources/{sourceId}/reindex_job/{jobId}',
      });

      registerOrgSourceReindexJobRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/sources/:sourceId/reindex_job/:jobId',
      });
    });
  });

  describe('GET /api/workplace_search/org/sources/{sourceId}/reindex_job/{jobId}/status', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/org/sources/{sourceId}/reindex_job/{jobId}/status',
      });

      registerOrgSourceReindexJobStatusRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/sources/:sourceId/reindex_job/:jobId/status',
      });
    });
  });

  describe('GET /api/workplace_search/org/settings/connectors', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/org/settings/connectors',
      });

      registerOrgSourceOauthConfigurationsRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/settings/connectors',
      });
    });
  });

  describe('GET /api/workplace_search/org/settings/connectors/{serviceType}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/org/settings/connectors/{serviceType}',
      });

      registerOrgSourceOauthConfigurationRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/settings/connectors/:serviceType',
      });
    });
  });

  describe('POST /api/workplace_search/org/settings/connectors/{serviceType}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/api/workplace_search/org/settings/connectors/{serviceType}',
        payload: 'body',
      });

      registerOrgSourceOauthConfigurationRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/settings/connectors/:serviceType',
      });
    });

    describe('validates', () => {
      it('correctly', () => {
        const request = { body: mockConfig };
        mockRouter.shouldValidate(request);
      });
    });
  });

  describe('PUT /api/workplace_search/org/settings/connectors/{serviceType}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'put',
        path: '/api/workplace_search/org/settings/connectors/{serviceType}',
        payload: 'body',
      });

      registerOrgSourceOauthConfigurationRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/settings/connectors/:serviceType',
      });
    });

    describe('validates', () => {
      it('correctly', () => {
        const request = { body: mockConfig };
        mockRouter.shouldValidate(request);
      });
    });
  });

  describe('DELETE /api/workplace_search/org/settings/connectors/{serviceType}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'delete',
        path: '/api/workplace_search/org/settings/connectors/{serviceType}',
      });

      registerOrgSourceOauthConfigurationRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/settings/connectors/:serviceType',
      });
    });
  });
});

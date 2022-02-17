/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockRouter, mockRequestHandler, mockDependencies } from '../../__mocks__';

import { ENTERPRISE_SEARCH_KIBANA_COOKIE } from '../../../common/constants';

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
  registerAccountSourceDownloadDiagnosticsRoute,
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
  registerOrgSourceDownloadDiagnosticsRoute,
  registerOrgSourceOauthConfigurationsRoute,
  registerOrgSourceOauthConfigurationRoute,
  registerOrgSourceSynchronizeRoute,
  registerOauthConnectorParamsRoute,
  registerAccountSourceValidateIndexingRulesRoute,
  registerOrgSourceValidateIndexingRulesRoute,
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
  describe('GET /internal/workplace_search/account/sources', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/workplace_search/account/sources',
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

  describe('GET /internal/workplace_search/account/sources/status', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/workplace_search/account/sources/status',
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

  describe('GET /internal/workplace_search/account/sources/{id}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/workplace_search/account/sources/{id}',
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

  describe('DELETE /internal/workplace_search/account/sources/{id}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'delete',
        path: '/internal/workplace_search/account/sources/{id}',
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

  describe('POST /internal/workplace_search/account/create_source', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/internal/workplace_search/account/create_source',
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
            index_permissions: true,
          },
        };
        mockRouter.shouldValidate(request);
      });
    });
  });

  describe('POST /internal/workplace_search/account/sources/{id}/documents', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/internal/workplace_search/account/sources/{id}/documents',
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

  describe('GET /internal/workplace_search/account/sources/{id}/federated_summary', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/workplace_search/account/sources/{id}/federated_summary',
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

  describe('GET /internal/workplace_search/account/sources/{id}/reauth_prepare', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/workplace_search/account/sources/{id}/reauth_prepare',
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

  describe('PATCH /internal/workplace_search/account/sources/{id}/settings', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'patch',
        path: '/internal/workplace_search/account/sources/{id}/settings',
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

  describe('POST /internal/workplace_search/account/sources/{id}/indexing_rules/validate', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/internal/workplace_search/account/sources/{id}/indexing_rules/validate',
      });

      registerAccountSourceValidateIndexingRulesRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/sources/:id/indexing_rules/validate',
      });
    });

    describe('validates', () => {
      it('correctly', () => {
        const request = {
          body: {
            rules: [
              {
                filter_type: 'path_template',
                exclude: '',
              },
            ],
          },
        };
        mockRouter.shouldValidate(request);
      });
    });
  });

  describe('GET /internal/workplace_search/account/pre_sources/{id}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/workplace_search/account/pre_sources/{id}',
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

  describe('GET /internal/workplace_search/account/sources/{serviceType}/prepare', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/workplace_search/account/sources/{serviceType}/prepare',
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

  describe('PUT /internal/workplace_search/account/sources/{id}/searchable', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'put',
        path: '/internal/workplace_search/account/sources/{id}/searchable',
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

  describe('GET /internal/workplace_search/account/sources/{id}/display_settings/config', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/workplace_search/account/sources/{id}/display_settings/config',
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

  describe('POST /internal/workplace_search/account/sources/{id}/display_settings/config', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/internal/workplace_search/account/sources/{id}/display_settings/config',
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

  describe('GET /internal/workplace_search/account/sources/{id}/schemas', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/workplace_search/account/sources/{id}/schemas',
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

  describe('POST /internal/workplace_search/account/sources/{id}/schemas', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/internal/workplace_search/account/sources/{id}/schemas',
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

  describe('GET /internal/workplace_search/account/sources/{sourceId}/reindex_job/{jobId}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/workplace_search/account/sources/{sourceId}/reindex_job/{jobId}',
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

  describe('GET /internal/workplace_search/account/sources/{sourceId}/download_diagnostics', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/workplace_search/account/sources/{sourceId}/download_diagnostics',
      });

      registerAccountSourceDownloadDiagnosticsRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/sources/:sourceId/download_diagnostics',
        hasJsonResponse: false,
      });
    });
  });

  describe('GET /internal/workplace_search/org/sources', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/workplace_search/org/sources',
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

  describe('GET /internal/workplace_search/org/sources/status', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/workplace_search/org/sources/status',
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

  describe('GET /internal/workplace_search/org/sources/{id}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/workplace_search/org/sources/{id}',
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

  describe('DELETE /internal/workplace_search/org/sources/{id}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'delete',
        path: '/internal/workplace_search/org/sources/{id}',
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

  describe('POST /internal/workplace_search/org/create_source', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/internal/workplace_search/org/create_source',
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
            index_permissions: true,
          },
        };
        mockRouter.shouldValidate(request);
      });
    });
  });

  describe('POST /internal/workplace_search/org/sources/{id}/documents', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/internal/workplace_search/org/sources/{id}/documents',
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

  describe('GET /internal/workplace_search/org/sources/{id}/federated_summary', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/workplace_search/org/sources/{id}/federated_summary',
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

  describe('GET /internal/workplace_search/org/sources/{id}/reauth_prepare', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/workplace_search/org/sources/{id}/reauth_prepare',
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

  describe('PATCH /internal/workplace_search/org/sources/{id}/settings', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'patch',
        path: '/internal/workplace_search/org/sources/{id}/settings',
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

  describe('POST /internal/workplace_search/org/sources/{id}/indexing_rules/validate', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/internal/workplace_search/org/sources/{id}/indexing_rules/validate',
      });

      registerOrgSourceValidateIndexingRulesRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/sources/:id/indexing_rules/validate',
      });
    });

    describe('validates', () => {
      it('correctly', () => {
        const request = {
          body: {
            rules: [
              {
                filter_type: 'path_template',
                exclude: '',
              },
            ],
          },
        };
        mockRouter.shouldValidate(request);
      });
    });
  });

  describe('GET /internal/workplace_search/org/pre_sources/{id}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/workplace_search/org/pre_sources/{id}',
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

  describe('GET /internal/workplace_search/org/sources/{serviceType}/prepare', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/workplace_search/org/sources/{serviceType}/prepare',
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

  describe('PUT /internal/workplace_search/org/sources/{id}/searchable', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'put',
        path: '/internal/workplace_search/org/sources/{id}/searchable',
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

  describe('GET /internal/workplace_search/org/sources/{id}/display_settings/config', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/workplace_search/org/sources/{id}/display_settings/config',
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

  describe('POST /internal/workplace_search/org/sources/{id}/display_settings/config', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/internal/workplace_search/org/sources/{id}/display_settings/config',
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

  describe('GET /internal/workplace_search/org/sources/{id}/schemas', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/workplace_search/org/sources/{id}/schemas',
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

  describe('POST /internal/workplace_search/org/sources/{id}/schemas', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/internal/workplace_search/org/sources/{id}/schemas',
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

  describe('GET /internal/workplace_search/org/sources/{sourceId}/reindex_job/{jobId}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/workplace_search/org/sources/{sourceId}/reindex_job/{jobId}',
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

  describe('GET /internal/workplace_search/org/sources/{sourceId}/download_diagnostics', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/workplace_search/org/sources/{sourceId}/download_diagnostics',
      });

      registerOrgSourceDownloadDiagnosticsRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/sources/:sourceId/download_diagnostics',
        hasJsonResponse: false,
      });
    });
  });

  describe('GET /internal/workplace_search/org/settings/connectors', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/workplace_search/org/settings/connectors',
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

  describe('POST /internal/workplace_search/org/settings/connectors', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/internal/workplace_search/org/settings/connectors',
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

    describe('validates', () => {
      it('correctly', () => {
        const request = { body: mockConfig };
        mockRouter.shouldValidate(request);
      });
    });
  });

  describe('PUT /internal/workplace_search/org/settings/connectors', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'put',
        path: '/internal/workplace_search/org/settings/connectors',
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

    describe('validates', () => {
      it('correctly', () => {
        const request = { body: mockConfig };
        mockRouter.shouldValidate(request);
      });
    });
  });

  describe('GET /internal/workplace_search/org/settings/connectors/{serviceType}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/workplace_search/org/settings/connectors/{serviceType}',
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

  describe('POST /internal/workplace_search/org/settings/connectors/{serviceType}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/internal/workplace_search/org/settings/connectors/{serviceType}',
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

  describe('PUT /internal/workplace_search/org/settings/connectors/{serviceType}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'put',
        path: '/internal/workplace_search/org/settings/connectors/{serviceType}',
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

  describe('DELETE /internal/workplace_search/org/settings/connectors/{serviceType}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'delete',
        path: '/internal/workplace_search/org/settings/connectors/{serviceType}',
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

  describe('POST /internal/workplace_search/org/sources/{id}/sync', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/internal/workplace_search/org/sources/{id}/sync',
      });

      registerOrgSourceSynchronizeRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/sources/:id/sync',
      });
    });
  });

  describe('GET /internal/workplace_search/sources/create', () => {
    const tokenPackage = 'some_encrypted_secrets';

    const mockRequest = {
      headers: {
        authorization: 'BASIC 123',
        cookie: `${ENTERPRISE_SEARCH_KIBANA_COOKIE}=${tokenPackage}`,
      },
    };

    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/workplace_search/sources/create',
      });

      registerOauthConnectorParamsRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      mockRouter.callRoute(mockRequest as any);

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/sources/create',
        params: { token_package: tokenPackage },
      });
    });
  });
});

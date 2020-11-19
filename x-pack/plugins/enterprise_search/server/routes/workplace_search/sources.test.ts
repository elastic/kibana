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
    });

    it('creates a request handler', () => {
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/account/sources',
        payload: 'params',
      });

      registerAccountSourcesRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });

      mockRouter.callRoute({});

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/sources',
      });
    });
  });

  describe('GET /api/workplace_search/account/sources/status', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('creates a request handler', () => {
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/account/sources/status',
        payload: 'params',
      });

      registerAccountSourcesStatusRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });

      mockRouter.callRoute({});

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/sources/status',
      });
    });
  });

  describe('GET /api/workplace_search/account/sources/{id}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('creates a request handler', () => {
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/account/sources/{id}',
        payload: 'params',
      });

      registerAccountSourceRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });

      const mockRequest = {
        params: {
          id: '123',
        },
      };

      mockRouter.callRoute(mockRequest);

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/sources/123',
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
        payload: 'params',
      });

      registerAccountSourceRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      const mockRequest = {
        params: {
          id: '123',
        },
      };

      mockRouter.callRoute(mockRequest);

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/sources/123',
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
      const mockRequest = {
        body: {
          service_type: 'google',
          name: 'Google',
          login: 'user',
          password: 'changeme',
          organizations: 'swiftype',
          indexPermissions: true,
        },
      };

      mockRouter.callRoute(mockRequest);

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/sources/form_create',
        body: mockRequest.body,
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
      const mockRequest = {
        params: { id: '123' },
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

      mockRouter.callRoute(mockRequest);

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/sources/123/documents',
        body: mockRequest.body,
      });
    });
  });

  describe('GET /api/workplace_search/account/sources/{id}/federated_summary', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('creates a request handler', () => {
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/account/sources/{id}/federated_summary',
        payload: 'params',
      });

      registerAccountSourceFederatedSummaryRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });

      const mockRequest = {
        params: {
          id: '123',
        },
      };

      mockRouter.callRoute(mockRequest);

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/sources/123/federated_summary',
      });
    });
  });

  describe('GET /api/workplace_search/account/sources/{id}/reauth_prepare', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('creates a request handler', () => {
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/account/sources/{id}/reauth_prepare',
        payload: 'params',
      });

      registerAccountSourceReauthPrepareRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });

      const mockRequest = {
        params: {
          id: '123',
        },
      };

      mockRouter.callRoute(mockRequest);

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/sources/123/reauth_prepare',
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
      const mockRequest = {
        params: { id: '123' },
        body: {
          query: {
            content_source: {
              name: 'foo',
            },
          },
        },
      };

      mockRouter.callRoute(mockRequest);

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/sources/123/settings',
        body: mockRequest.body,
      });
    });
  });

  describe('GET /api/workplace_search/account/pre_sources/{id}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('creates a request handler', () => {
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/account/pre_sources/{id}',
        payload: 'params',
      });

      registerAccountPreSourceRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });

      const mockRequest = {
        params: {
          id: '123',
        },
      };

      mockRouter.callRoute(mockRequest);

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/pre_content_sources/123',
      });
    });
  });

  describe('GET /api/workplace_search/account/sources/{service_type}/prepare', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('creates a request handler', () => {
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/account/sources/{service_type}/prepare',
        payload: 'params',
      });

      registerAccountPrepareSourcesRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });

      const mockRequest = {
        params: {
          service_type: 'zendesk',
        },
      };

      mockRouter.callRoute(mockRequest);

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/pre_content_sources/zendesk',
      });
    });
  });

  describe('PUT /api/workplace_search/account/sources/{id}/searchable', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('creates a request handler', () => {
      mockRouter = new MockRouter({
        method: 'put',
        path: '/api/workplace_search/account/sources/{id}/searchable',
        payload: 'body',
      });

      registerAccountSourceSearchableRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });

      const mockRequest = {
        params: {
          id: '123',
        },
        body: {
          searchable: true,
        },
      };

      mockRouter.callRoute(mockRequest);

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/sources/123/searchable',
        body: mockRequest.body,
      });
    });
  });

  describe('GET /api/workplace_search/org/sources', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('creates a request handler', () => {
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/org/sources',
        payload: 'params',
      });

      registerOrgSourcesRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });

      mockRouter.callRoute({});

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/sources',
      });
    });
  });

  describe('GET /api/workplace_search/org/sources/status', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('creates a request handler', () => {
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/org/sources/status',
        payload: 'params',
      });

      registerOrgSourcesStatusRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });

      mockRouter.callRoute({});

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/sources/status',
      });
    });
  });

  describe('GET /api/workplace_search/org/sources/{id}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('creates a request handler', () => {
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/org/sources/{id}',
        payload: 'params',
      });

      registerOrgSourceRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });

      const mockRequest = {
        params: {
          id: '123',
        },
      };

      mockRouter.callRoute(mockRequest);

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/sources/123',
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
        payload: 'params',
      });

      registerOrgSourceRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      const mockRequest = {
        params: {
          id: '123',
        },
      };

      mockRouter.callRoute(mockRequest);

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/sources/123',
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
      const mockRequest = {
        body: {
          service_type: 'google',
          name: 'Google',
          login: 'user',
          password: 'changeme',
          organizations: 'swiftype',
          indexPermissions: true,
        },
      };

      mockRouter.callRoute(mockRequest);

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/sources/form_create',
        body: mockRequest.body,
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
      const mockRequest = {
        params: { id: '123' },
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

      mockRouter.callRoute(mockRequest);

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/sources/123/documents',
        body: mockRequest.body,
      });
    });
  });

  describe('GET /api/workplace_search/org/sources/{id}/federated_summary', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('creates a request handler', () => {
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/org/sources/{id}/federated_summary',
        payload: 'params',
      });

      registerOrgSourceFederatedSummaryRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });

      const mockRequest = {
        params: {
          id: '123',
        },
      };

      mockRouter.callRoute(mockRequest);

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/sources/123/federated_summary',
      });
    });
  });

  describe('GET /api/workplace_search/org/sources/{id}/reauth_prepare', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('creates a request handler', () => {
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/org/sources/{id}/reauth_prepare',
        payload: 'params',
      });

      registerOrgSourceReauthPrepareRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });

      const mockRequest = {
        params: {
          id: '123',
        },
      };

      mockRouter.callRoute(mockRequest);

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/sources/123/reauth_prepare',
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
      const mockRequest = {
        params: { id: '123' },
        body: {
          query: {
            content_source: {
              name: 'foo',
            },
          },
        },
      };

      mockRouter.callRoute(mockRequest);

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/sources/123/settings',
        body: mockRequest.body,
      });
    });
  });

  describe('GET /api/workplace_search/org/pre_sources/{id}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('creates a request handler', () => {
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/org/pre_sources/{id}',
        payload: 'params',
      });

      registerOrgPreSourceRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });

      const mockRequest = {
        params: {
          id: '123',
        },
      };

      mockRouter.callRoute(mockRequest);

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/pre_content_sources/123',
      });
    });
  });

  describe('GET /api/workplace_search/org/sources/{service_type}/prepare', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('creates a request handler', () => {
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/org/sources/{service_type}/prepare',
        payload: 'params',
      });

      registerOrgPrepareSourcesRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });

      const mockRequest = {
        params: {
          service_type: 'zendesk',
        },
      };

      mockRouter.callRoute(mockRequest);

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/pre_content_sources/zendesk',
      });
    });
  });

  describe('PUT /api/workplace_search/org/sources/{id}/searchable', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('creates a request handler', () => {
      mockRouter = new MockRouter({
        method: 'put',
        path: '/api/workplace_search/org/sources/{id}/searchable',
        payload: 'body',
      });

      registerOrgSourceSearchableRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });

      const mockRequest = {
        params: {
          id: '123',
        },
        body: {
          searchable: true,
        },
      };

      mockRouter.callRoute(mockRequest);

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/sources/123/searchable',
        body: mockRequest.body,
      });
    });
  });

  describe('GET /api/workplace_search/org/settings/connectors', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('creates a request handler', () => {
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/org/settings/connectors',
      });

      registerOrgSourceOauthConfigurationsRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });

      mockRouter.callRoute({});

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/settings/connectors',
      });
    });
  });

  describe('GET /api/workplace_search/org/settings/connectors/{service_type}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('creates a request handler', () => {
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/workplace_search/org/settings/connectors/{service_type}',
        payload: 'params',
      });

      registerOrgSourceOauthConfigurationRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });

      const mockRequest = {
        params: {
          service_type: 'zendesk',
        },
      };

      mockRouter.callRoute(mockRequest);

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/settings/connectors/zendesk',
      });
    });
  });

  describe('POST /api/workplace_search/org/settings/connectors/{service_type}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('creates a request handler', () => {
      mockRouter = new MockRouter({
        method: 'post',
        path: '/api/workplace_search/org/settings/connectors/{service_type}',
        payload: 'body',
      });

      registerOrgSourceOauthConfigurationRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });

      const mockRequest = {
        params: {
          service_type: 'zendesk',
        },
        body: mockConfig,
      };

      mockRouter.callRoute(mockRequest);

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/settings/connectors/zendesk',
        body: mockRequest.body,
      });
    });
  });

  describe('PUT /api/workplace_search/org/settings/connectors/{service_type}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('creates a request handler', () => {
      mockRouter = new MockRouter({
        method: 'put',
        path: '/api/workplace_search/org/settings/connectors/{service_type}',
        payload: 'body',
      });

      registerOrgSourceOauthConfigurationRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });

      const mockRequest = {
        params: {
          service_type: 'zendesk',
        },
        body: mockConfig,
      };

      mockRouter.callRoute(mockRequest);

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/settings/connectors/zendesk',
        body: mockRequest.body,
      });
    });
  });

  describe('DELETE /api/workplace_search/org/settings/connectors/{service_type}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('creates a request handler', () => {
      mockRouter = new MockRouter({
        method: 'delete',
        path: '/api/workplace_search/org/settings/connectors/{service_type}',
        payload: 'params',
      });

      registerOrgSourceOauthConfigurationRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });

      const mockRequest = {
        params: {
          service_type: 'zendesk',
        },
      };

      mockRouter.callRoute(mockRequest);

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org/settings/connectors/zendesk',
      });
    });
  });
});

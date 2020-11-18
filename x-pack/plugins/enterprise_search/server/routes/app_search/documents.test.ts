/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MockRouter, mockRequestHandler, mockDependencies } from '../../__mocks__';

import { registerDocumentRoutes } from './documents';

describe('document routes', () => {
  describe('GET /api/app_search/engines/{engineName}/documents/{documentId}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/api/app_search/engines/{engineName}/documents/{documentId}',
      });

      registerDocumentRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      mockRouter.callRoute({ params: { engineName: 'some-engine', documentId: '1' } });

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/engines/some-engine/documents/1',
      });
    });
  });

  describe('DELETE /api/app_search/engines/{engineName}/documents/{documentId}', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'delete',
        path: '/api/app_search/engines/{engineName}/documents/{documentId}',
      });

      registerDocumentRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      mockRouter.callRoute({ params: { engineName: 'some-engine', documentId: '1' } });

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/engines/some-engine/documents/1',
      });
    });
  });
});

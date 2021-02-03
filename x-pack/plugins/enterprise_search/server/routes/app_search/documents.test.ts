/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MockRouter, mockRequestHandler, mockDependencies } from '../../__mocks__';

import { registerDocumentsRoutes, registerDocumentRoutes } from './documents';

describe('documents routes', () => {
  describe('POST /api/app_search/engines/{engineName}/documents', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'post',
        path: '/api/app_search/engines/{engineName}/documents',
        payload: 'body',
      });

      registerDocumentsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/engines/:engineName/documents/new',
      });
    });

    describe('validates', () => {
      it('correctly', () => {
        const request = { body: { documents: [{ foo: 'bar' }] } };
        mockRouter.shouldValidate(request);
      });

      it('missing documents', () => {
        const request = { body: {} };
        mockRouter.shouldThrow(request);
      });

      it('wrong document type', () => {
        const request = { body: { documents: ['test'] } };
        mockRouter.shouldThrow(request);
      });

      it('non-array documents type', () => {
        const request = { body: { documents: { foo: 'bar' } } };
        mockRouter.shouldThrow(request);
      });
    });
  });
});

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
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/engines/:engineName/documents/:documentId',
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
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/engines/:engineName/documents/:documentId',
      });
    });
  });
});

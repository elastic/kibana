/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpFetchOptions } from '../../../../../src/core/public';
import { httpServiceMock } from '../../../../../src/core/public/mocks';

import { deleteList, exportList, findLists, importList } from './api';

describe('Value Lists API', () => {
  let httpMock: ReturnType<typeof httpServiceMock.createStartContract>;

  beforeEach(() => {
    httpMock = httpServiceMock.createStartContract();
  });

  describe('deleteList', () => {
    it('DELETEs specifying the id as a query parameter', async () => {
      const abortCtrl = new AbortController();
      await deleteList({
        http: httpMock,
        id: 'my_list',
        signal: abortCtrl.signal,
      });

      expect(httpMock.fetch).toHaveBeenCalledWith(
        '/api/lists',
        expect.objectContaining({
          method: 'DELETE',
          query: { id: 'my_list' },
        })
      );
    });
  });

  describe('findLists', () => {
    it('GETs from the lists endpoint', async () => {
      const abortCtrl = new AbortController();
      await findLists({
        http: httpMock,
        pageIndex: 0,
        pageSize: 10,
        signal: abortCtrl.signal,
      });

      expect(httpMock.fetch).toHaveBeenCalledWith(
        '/api/lists/_find',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('sends pagination as query parameters', async () => {
      const abortCtrl = new AbortController();
      await findLists({
        http: httpMock,
        pageIndex: 1,
        pageSize: 10,
        signal: abortCtrl.signal,
      });

      expect(httpMock.fetch).toHaveBeenCalledWith(
        '/api/lists/_find',
        expect.objectContaining({
          query: { page: 1, per_page: 10 },
        })
      );
    });
  });

  describe('importList', () => {
    it('POSTs the file', async () => {
      const abortCtrl = new AbortController();
      const fileMock = ('my file' as unknown) as File;

      await importList({
        file: fileMock,
        http: httpMock,
        listId: 'my_list',
        signal: abortCtrl.signal,
        type: 'keyword',
      });
      expect(httpMock.fetch).toHaveBeenCalledWith(
        '/api/lists/items/_import',
        expect.objectContaining({
          method: 'POST',
        })
      );

      // httpmock's fetch signature is inferred incorrectly
      const [[, { body }]] = (httpMock.fetch.mock.calls as unknown) as Array<
        [unknown, HttpFetchOptions]
      >;
      const actualFile = (body as FormData).get('file');
      expect(actualFile).toEqual('my file');
    });

    it('sends type and id as query parameters', async () => {
      const abortCtrl = new AbortController();
      const fileMock = ('my file' as unknown) as File;

      await importList({
        file: fileMock,
        http: httpMock,
        listId: 'my_list',
        signal: abortCtrl.signal,
        type: 'keyword',
      });

      expect(httpMock.fetch).toHaveBeenCalledWith(
        '/api/lists/items/_import',
        expect.objectContaining({
          query: { list_id: 'my_list', type: 'keyword' },
        })
      );
    });
  });

  describe('exportList', () => {
    it('POSTs to the export endpoint', async () => {
      const abortCtrl = new AbortController();

      await exportList({
        http: httpMock,
        id: 'my_list',
        signal: abortCtrl.signal,
      });
      expect(httpMock.fetch).toHaveBeenCalledWith(
        '/api/lists/items/_export',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('sends type and id as query parameters', async () => {
      const abortCtrl = new AbortController();

      await exportList({
        http: httpMock,
        id: 'my_list',
        signal: abortCtrl.signal,
      });
      expect(httpMock.fetch).toHaveBeenCalledWith(
        '/api/lists/items/_export',
        expect.objectContaining({
          query: { list_id: 'my_list' },
        })
      );
    });
  });
});

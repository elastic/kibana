/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpFetchOptions } from '../../../../../src/core/public';
import { httpServiceMock } from '../../../../../src/core/public/mocks';
import { getDeleteListSchemaMock } from '../../common/schemas/request/delete_list_schema.mock';
import { getListResponseMock } from '../../common/schemas/response/list_schema.mock';
import { DeleteListSchema } from '../../common/schemas';

import { deleteList, exportList, findLists, importList } from './api';

describe('Value Lists API', () => {
  let httpMock: ReturnType<typeof httpServiceMock.createStartContract>;

  beforeEach(() => {
    httpMock = httpServiceMock.createStartContract();
  });

  describe('deleteList', () => {
    beforeEach(() => {
      httpMock.fetch.mockResolvedValue(getListResponseMock());
    });

    it('DELETEs specifying the id as a query parameter', async () => {
      const abortCtrl = new AbortController();
      const payload: DeleteListSchema = getDeleteListSchemaMock();
      await deleteList({
        http: httpMock,
        ...payload,
        signal: abortCtrl.signal,
      });

      expect(httpMock.fetch).toHaveBeenCalledWith(
        '/api/lists',
        expect.objectContaining({
          method: 'DELETE',
          query: getDeleteListSchemaMock(),
        })
      );
    });

    it('rejects with an error if request payload is invalid (and does not make API call)', async () => {
      const abortCtrl = new AbortController();
      const payload: Omit<DeleteListSchema, 'id'> & {
        id: number;
      } = { ...getDeleteListSchemaMock(), id: 23 };

      await expect(
        deleteList({
          http: httpMock,
          ...((payload as unknown) as DeleteListSchema),
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual('Invalid value "23" supplied to "id"');
      expect(httpMock.fetch).not.toHaveBeenCalled();
    });

    it('rejects with an error if response payload is invalid', async () => {
      const abortCtrl = new AbortController();
      const payload: DeleteListSchema = getDeleteListSchemaMock();
      const badResponse = { ...getListResponseMock(), id: undefined };
      httpMock.fetch.mockResolvedValue(badResponse);

      await expect(
        deleteList({
          http: httpMock,
          ...payload,
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual('Invalid value "undefined" supplied to "id"');
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

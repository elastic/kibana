/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpFetchOptions } from '../../../../../src/core/public';
import { httpServiceMock } from '../../../../../src/core/public/mocks';
import { getListResponseMock } from '../../common/schemas/response/list_schema.mock';
import { getFoundListSchemaMock } from '../../common/schemas/response/found_list_schema.mock';

import { deleteList, exportList, findLists, importList } from './api';
import {
  ApiPayload,
  DeleteListParams,
  ExportListParams,
  FindListsParams,
  ImportListParams,
} from './types';

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
      const payload: ApiPayload<DeleteListParams> = { id: 'list-id' };
      await deleteList({
        http: httpMock,
        ...payload,
        signal: abortCtrl.signal,
      });

      expect(httpMock.fetch).toHaveBeenCalledWith(
        '/api/lists',
        expect.objectContaining({
          method: 'DELETE',
          query: { id: 'list-id' },
        })
      );
    });

    it('rejects with an error if request payload is invalid (and does not make API call)', async () => {
      const abortCtrl = new AbortController();
      const payload: Omit<ApiPayload<DeleteListParams>, 'id'> & {
        id: number;
      } = { id: 23 };

      await expect(
        deleteList({
          http: httpMock,
          ...((payload as unknown) as ApiPayload<DeleteListParams>),
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual('Invalid value "23" supplied to "id"');
      expect(httpMock.fetch).not.toHaveBeenCalled();
    });

    it('rejects with an error if response payload is invalid', async () => {
      const abortCtrl = new AbortController();
      const payload: ApiPayload<DeleteListParams> = { id: 'list-id' };
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
    beforeEach(() => {
      httpMock.fetch.mockResolvedValue(getFoundListSchemaMock());
    });

    it('GETs from the lists endpoint', async () => {
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

    it('rejects with an error if request payload is invalid (and does not make API call)', async () => {
      const abortCtrl = new AbortController();
      const payload: ApiPayload<FindListsParams> = { pageIndex: 10, pageSize: 0 };

      await expect(
        findLists({
          http: httpMock,
          ...payload,
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual('Invalid value "0" supplied to "per_page"');
      expect(httpMock.fetch).not.toHaveBeenCalled();
    });

    it('rejects with an error if response payload is invalid', async () => {
      const abortCtrl = new AbortController();
      const payload: ApiPayload<FindListsParams> = { pageIndex: 1, pageSize: 10 };
      const badResponse = { ...getFoundListSchemaMock(), cursor: undefined };
      httpMock.fetch.mockResolvedValue(badResponse);

      await expect(
        findLists({
          http: httpMock,
          ...payload,
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual('Invalid value "undefined" supplied to "cursor"');
    });
  });

  describe('importList', () => {
    beforeEach(() => {
      httpMock.fetch.mockResolvedValue(getListResponseMock());
    });

    it('POSTs the file', async () => {
      const abortCtrl = new AbortController();
      const file = new File([], 'name');

      await importList({
        file,
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
      expect(actualFile).toEqual(file);
    });

    it('sends type and id as query parameters', async () => {
      const abortCtrl = new AbortController();
      const file = new File([], 'name');

      await importList({
        file,
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

    it('rejects with an error if request body is invalid (and does not make API call)', async () => {
      const abortCtrl = new AbortController();
      const payload: ApiPayload<ImportListParams> = {
        file: (undefined as unknown) as File,
        listId: 'list-id',
        type: 'ip',
      };

      await expect(
        importList({
          http: httpMock,
          ...payload,
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual('Invalid value "undefined" supplied to "file"');
      expect(httpMock.fetch).not.toHaveBeenCalled();
    });

    it('rejects with an error if request params are invalid (and does not make API call)', async () => {
      const abortCtrl = new AbortController();
      const file = new File([], 'name');
      const payload: ApiPayload<ImportListParams> = {
        file,
        listId: 'list-id',
        type: 'other' as 'ip',
      };

      await expect(
        importList({
          http: httpMock,
          ...payload,
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual('Invalid value "other" supplied to "type"');
      expect(httpMock.fetch).not.toHaveBeenCalled();
    });

    it('rejects with an error if response payload is invalid', async () => {
      const abortCtrl = new AbortController();
      const file = new File([], 'name');
      const payload: ApiPayload<ImportListParams> = {
        file,
        listId: 'list-id',
        type: 'ip',
      };
      const badResponse = { ...getListResponseMock(), id: undefined };
      httpMock.fetch.mockResolvedValue(badResponse);

      await expect(
        importList({
          http: httpMock,
          ...payload,
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual('Invalid value "undefined" supplied to "id"');
    });
  });

  describe('exportList', () => {
    beforeEach(() => {
      httpMock.fetch.mockResolvedValue(getListResponseMock());
    });

    it('POSTs to the export endpoint', async () => {
      const abortCtrl = new AbortController();

      await exportList({
        http: httpMock,
        listId: 'my_list',
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
        listId: 'my_list',
        signal: abortCtrl.signal,
      });
      expect(httpMock.fetch).toHaveBeenCalledWith(
        '/api/lists/items/_export',
        expect.objectContaining({
          query: { list_id: 'my_list' },
        })
      );
    });

    it('rejects with an error if request params are invalid (and does not make API call)', async () => {
      const abortCtrl = new AbortController();
      const payload: ApiPayload<ExportListParams> = {
        listId: (23 as unknown) as string,
      };

      await expect(
        exportList({
          http: httpMock,
          ...payload,
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual('Invalid value "23" supplied to "list_id"');
      expect(httpMock.fetch).not.toHaveBeenCalled();
    });

    it('rejects with an error if response payload is invalid', async () => {
      const abortCtrl = new AbortController();
      const payload: ApiPayload<ExportListParams> = {
        listId: 'list-id',
      };
      const badResponse = { ...getListResponseMock(), id: undefined };
      httpMock.fetch.mockResolvedValue(badResponse);

      await expect(
        exportList({
          http: httpMock,
          ...payload,
          signal: abortCtrl.signal,
        })
      ).rejects.toEqual('Invalid value "undefined" supplied to "id"');
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pipe } from 'fp-ts/lib/function';
import * as qs from 'query-string';
import type { HttpStart } from '@kbn/core/public';
import type { FilesClient } from '../types';
import {
  API_BASE_PATH,
  FILES_API_BASE_PATH,
  FILES_PUBLIC_API_BASE_PATH,
  FILES_SHARE_API_BASE_PATH,
} from '../../common/api_routes';

const addQueryParams =
  (queryParams: object) =>
  (path: string): string => {
    const stringified = qs.stringify(queryParams);
    return `${path}${stringified ? `?${stringified}` : ''}`;
  };

/**
 * @internal
 */
export const apiRoutes = {
  /**
   * Scoped to file kind
   */
  getCreateFileRoute: (fileKind: string) => `${FILES_API_BASE_PATH}/${fileKind}`,
  getUploadRoute: (fileKind: string, id: string) => `${FILES_API_BASE_PATH}/${fileKind}/${id}/blob`,
  getDownloadRoute: (fileKind: string, id: string, fileName?: string) =>
    `${FILES_API_BASE_PATH}/${fileKind}/${id}/blob${fileName ? '/' + fileName : ''}`,
  getUpdateRoute: (fileKind: string, id: string) => `${FILES_API_BASE_PATH}/${fileKind}/${id}`,
  getDeleteRoute: (fileKind: string, id: string) => `${FILES_API_BASE_PATH}/${fileKind}/${id}`,
  getListRoute: (fileKind: string, page?: number, perPage?: number) => {
    return pipe(`${FILES_API_BASE_PATH}/${fileKind}/list`, addQueryParams({ page, perPage }));
  },
  getByIdRoute: (fileKind: string, id: string) => `${FILES_API_BASE_PATH}/${fileKind}/${id}`,

  /**
   * Scope to file shares and file kind
   */
  getShareRoute: (fileKind: string, id: string) => `${FILES_SHARE_API_BASE_PATH}/${fileKind}/${id}`,
  getListSharesRoute: (fileKind: string, page?: number, perPage?: number, forFileId?: string) =>
    pipe(`${FILES_SHARE_API_BASE_PATH}/${fileKind}`, addQueryParams({ page, perPage, forFileId })),

  /**
   * Public routes
   */
  getPublicDownloadRoute: (token: string, fileName?: string) =>
    pipe(
      `${FILES_PUBLIC_API_BASE_PATH}/blob${fileName ? '/' + fileName : ''}`,
      addQueryParams({ token })
    ),

  /**
   * Top-level routes
   */
  getFindRoute: (page?: number, perPage?: number) =>
    pipe(`${API_BASE_PATH}/find`, addQueryParams({ page, perPage })),
  getMetricsRoute: () => `${API_BASE_PATH}/metrics`,
};

interface Args {
  fileKind: string;
  http: HttpStart;
}

const commonBodyHeaders = {
  headers: {
    'content-type': 'application/json',
  },
};

export const createFilesClient = ({ http, fileKind }: Args): FilesClient => {
  return {
    create: (args) => {
      return http.post(apiRoutes.getCreateFileRoute(fileKind), {
        headers: commonBodyHeaders,
        body: JSON.stringify(args),
      });
    },
    delete: (args) => {
      return http.delete(apiRoutes.getDeleteRoute(fileKind, args.id));
    },
    download: (args) => {
      return http.get(apiRoutes.getDownloadRoute(fileKind, args.id, args.fileName));
    },
    getById: (args) => {
      return http.get(apiRoutes.getByIdRoute(fileKind, args.id));
    },
    list: ({ page, perPage }) => {
      return http.get(apiRoutes.getListRoute(fileKind, page, perPage));
    },
    update: ({ id, ...body }) => {
      return http.patch(apiRoutes.getUpdateRoute(fileKind, id), {
        headers: commonBodyHeaders,
        body: JSON.stringify(body),
      });
    },
    upload: (args) => {
      return http.put(apiRoutes.getUploadRoute(fileKind, args.id), {
        headers: {
          'content-type': 'application/octet-stream',
        },
        body: args.body,
      });
    },
    share: ({ fileId, name, validUntil }) => {
      return http.post(apiRoutes.getShareRoute(fileKind, fileId), {
        headers: commonBodyHeaders,
        body: JSON.stringify({ name, validUntil }),
      });
    },
    unshare: ({ id }) => {
      return http.delete(apiRoutes.getShareRoute(fileKind, id));
    },
    getShare: ({ id }) => {
      return http.get(apiRoutes.getShareRoute(fileKind, id));
    },
    listShares: ({ forFileId, page, perPage }) => {
      return http.get(apiRoutes.getListSharesRoute(fileKind, page, perPage, forFileId));
    },
    find: ({ page, perPage, ...filterArgs }) => {
      return http.post(apiRoutes.getFindRoute(page, perPage), {
        headers: commonBodyHeaders,
        body: JSON.stringify(filterArgs),
      });
    },
    getMetrics: () => {
      return http.get(apiRoutes.getMetricsRoute());
    },
    publicDownload: ({ token, fileName }) => {
      return http.get(apiRoutes.getPublicDownloadRoute(token, fileName));
    },
  };
};

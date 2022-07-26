/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as qs from 'query-string';
import type { HttpStart } from '@kbn/core/public';
import type { FilesClient } from '../types';
import { FILES_API_BASE_PATH } from '../../common/api_routes';

const apiRoutes = {
  getCreateFileRoute: (fileKind: string) => `${FILES_API_BASE_PATH}/${fileKind}`,
  getUploadRoute: (fileKind: string, id: string) => `${FILES_API_BASE_PATH}/${fileKind}/${id}/blob`,
  getDownloadRoute: (fileKind: string, id: string, fileName?: string) =>
    `${FILES_API_BASE_PATH}/${fileKind}/${id}/blob/${fileName ? fileName : ''}`,
  getUpdateRoute: (fileKind: string, id: string) => `${FILES_API_BASE_PATH}/${fileKind}/${id}`,
  getDeleteRoute: (fileKind: string, id: string) => `${FILES_API_BASE_PATH}/${fileKind}/${id}`,
  getListRoute: (fileKind: string, page?: number, perPage?: number) => {
    const qParams = qs.stringify({ page, perPage });
    return `${FILES_API_BASE_PATH}/${fileKind}/list${qParams ? `?${qParams}` : ''}`;
  },
  getByIdRoute: (fileKind: string, id: string) => `${FILES_API_BASE_PATH}/${fileKind}/${id}`,
};

interface Args {
  fileKind: string;
  http: HttpStart;
}

export const createFilesClient = ({ http, fileKind }: Args): FilesClient => {
  return {
    create(args) {
      return http.post(apiRoutes.getCreateFileRoute(fileKind), {
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(args),
      });
    },
    delete(args) {
      return http.delete(apiRoutes.getDeleteRoute(fileKind, args.id));
    },
    download(args) {
      return http.get(apiRoutes.getDownloadRoute(fileKind, args.id, args.fileName));
    },
    getById(args) {
      return http.get(apiRoutes.getByIdRoute(fileKind, args.id));
    },
    list(args) {
      return http.get(apiRoutes.getListRoute(fileKind, args.page, args.perPage));
    },
    update({ id, ...body }) {
      return http.patch(apiRoutes.getUpdateRoute(fileKind, id), {
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    },
    upload(args) {
      return http.put(apiRoutes.getUploadRoute(fileKind, args.id), {
        body: args.body,
      });
    },
  };
};

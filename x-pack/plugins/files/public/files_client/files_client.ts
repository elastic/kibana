/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type { FilesClient as IFilesClient } from '../types';
import { FILE_KIND_API_ROUTES_FILLED } from '../../common/api_routes';

interface Args {
  fileKind: string;
  http: HttpStart;
}

export const createFilesClient = ({ http, fileKind }: Args): IFilesClient => {
  return {
    create(args) {
      return http.post(FILE_KIND_API_ROUTES_FILLED.getCreateFileRoute(fileKind), {
        body: JSON.stringify(args),
      });
    },
    delete(args) {
      return http.delete(FILE_KIND_API_ROUTES_FILLED.getDeleteRoute(fileKind, args.id));
    },
    download(args) {
      return http.get(
        FILE_KIND_API_ROUTES_FILLED.getDownloadRoute(fileKind, args.id, args.fileName)
      );
    },
    getById(args) {
      return http.get(FILE_KIND_API_ROUTES_FILLED.getByIdRoute(fileKind, args.id));
    },
    list(args) {
      return http.get(FILE_KIND_API_ROUTES_FILLED.getListRoute(fileKind, args.page, args.perPage));
    },
    update({ id, ...body }) {
      return http.patch(FILE_KIND_API_ROUTES_FILLED.getUpdateRoute(fileKind, id), {
        body: JSON.stringify(body),
      });
    },
    upload(args) {
      return http.put(FILE_KIND_API_ROUTES_FILLED.getUploadRoute(fileKind, args.id), {
        body: args.body,
      });
    },
  };
};

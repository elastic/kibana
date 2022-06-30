/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type { FilesClient } from '../types';
import { FILE_KIND_API_ROUTES_CLIENT } from '../../common/api_routes';

interface Args {
  fileKind: string;
  http: HttpStart;
}

export const createFilesClient = ({ http, fileKind }: Args): FilesClient => {
  return {
    create(args) {
      return http.post(FILE_KIND_API_ROUTES_CLIENT.getCreateFileRoute(fileKind), {
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(args),
      });
    },
    delete(args) {
      return http.delete(FILE_KIND_API_ROUTES_CLIENT.getDeleteRoute(fileKind, args.id));
    },
    download(args) {
      return http.get(
        FILE_KIND_API_ROUTES_CLIENT.getDownloadRoute(fileKind, args.id, args.fileName)
      );
    },
    getById(args) {
      return http.get(FILE_KIND_API_ROUTES_CLIENT.getByIdRoute(fileKind, args.id));
    },
    list(args) {
      return http.get(FILE_KIND_API_ROUTES_CLIENT.getListRoute(fileKind, args.page, args.perPage));
    },
    update({ id, ...body }) {
      return http.patch(FILE_KIND_API_ROUTES_CLIENT.getUpdateRoute(fileKind, id), {
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    },
    upload(args) {
      return http.put(FILE_KIND_API_ROUTES_CLIENT.getUploadRoute(fileKind, args.id), {
        body: args.body,
      });
    },
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FILE_KIND_API_ROUTES } from '../../../common/api_routes';
import { fileKindsRegistry } from '../../file_kinds_registry';
import { FilesRouter } from '../types';
import { enhanceRouter } from './enhance_router';

import * as create from './create';
import * as upload from './upload';

export function registerFileKindRoutes(router: FilesRouter) {
  fileKindsRegistry.getAll().forEach((fileKind) => {
    const fileKindRouter = enhanceRouter({ router, fileKind: fileKind.id });

    if (fileKind.http.create) {
      fileKindRouter.post(
        {
          path: FILE_KIND_API_ROUTES.getCreateFileRoute(fileKind.id),
          validate: {
            body: create.bodySchema,
          },
          options: {
            tags: fileKind.http.create.tags,
          },
        },
        create.handler
      );

      fileKindRouter.put(
        {
          path: FILE_KIND_API_ROUTES.getCreateFileRoute(fileKind.id),
          validate: {
            body: upload.bodySchema,
            params: upload.paramsSchema,
          },
        },
        upload.handler
      );
    }
  });
}

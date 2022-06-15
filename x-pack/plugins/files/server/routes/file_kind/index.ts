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
import * as update from './update';
import * as list from './list';
import * as download from './download';
import * as find from './find';

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
          options: {
            tags: fileKind.http.create.tags,
          },
        },
        upload.handler
      );
    }
    if (fileKind.http.update) {
      fileKindRouter.patch(
        {
          path: FILE_KIND_API_ROUTES.getUpdateRoute(fileKind.id),
          validate: {
            body: update.bodySchema,
            params: update.paramsSchema,
          },
          options: {
            tags: fileKind.http.update.tags,
          },
        },
        update.handler
      );
    }
    if (fileKind.http.delete) {
      fileKindRouter.delete(
        {
          path: FILE_KIND_API_ROUTES.getUpdateRoute(fileKind.id),
          validate: {
            body: update.bodySchema,
            params: update.paramsSchema,
          },
          options: {
            tags: fileKind.http.delete.tags,
          },
        },
        update.handler
      );
    }
    if (fileKind.http.list) {
      fileKindRouter.get(
        {
          path: FILE_KIND_API_ROUTES.getListRoute(fileKind.id),
          validate: {},
          options: {
            tags: fileKind.http.list.tags,
          },
        },
        list.handler
      );
    }
    if (fileKind.http.download) {
      fileKindRouter.get(
        {
          path: FILE_KIND_API_ROUTES.getDownloadRoute(fileKind.id),
          validate: {
            params: download.paramsSchema,
          },
          options: {
            tags: fileKind.http.download.tags,
          },
        },
        download.handler
      );
    }
    if (fileKind.http.find) {
      fileKindRouter.get(
        {
          path: FILE_KIND_API_ROUTES.getFindRoute(fileKind.id),
          validate: {
            params: find.paramsSchema,
          },
          options: {
            tags: fileKind.http.find.tags,
          },
        },
        find.handler
      );
    }
  });
}

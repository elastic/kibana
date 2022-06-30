/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FILE_KIND_API_ROUTES_SERVER } from '../../../common/api_routes';
import { fileKindsRegistry } from '../../file_kinds_registry';

import { FilesRouter } from '../types';

import { enhanceRouter } from './enhance_router';
import * as create from './create';
import * as upload from './upload';
import * as update from './update';
import * as deleteEndpoint from './delete';
import * as list from './list';
import * as download from './download';
import * as getById from './get_by_id';

export function registerFileKindRoutes(router: FilesRouter) {
  fileKindsRegistry.getAll().forEach((fileKind) => {
    const fileKindRouter = enhanceRouter({ router, fileKind: fileKind.id });
    if (fileKind.http.create) {
      fileKindRouter[create.method](
        {
          path: FILE_KIND_API_ROUTES_SERVER.getCreateFileRoute(fileKind.id),
          validate: {
            body: create.bodySchema,
          },
          options: {
            tags: fileKind.http.create.tags,
          },
        },
        create.handler
      );

      fileKindRouter[upload.method](
        {
          path: FILE_KIND_API_ROUTES_SERVER.getUploadRoute(fileKind.id),
          validate: {
            body: upload.bodySchema,
            params: upload.paramsSchema,
          },
          options: {
            tags: fileKind.http.create.tags,
            body: {
              output: 'stream',
              parse: false,
              accepts: 'application/octet-stream',
            },
          },
        },
        upload.handler
      );
    }
    if (fileKind.http.update) {
      fileKindRouter[update.method](
        {
          path: FILE_KIND_API_ROUTES_SERVER.getUpdateRoute(fileKind.id),
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
      fileKindRouter[deleteEndpoint.method](
        {
          path: FILE_KIND_API_ROUTES_SERVER.getDeleteRoute(fileKind.id),
          validate: {
            params: deleteEndpoint.paramsSchema,
          },
          options: {
            tags: fileKind.http.delete.tags,
          },
        },
        deleteEndpoint.handler
      );
    }
    if (fileKind.http.list) {
      fileKindRouter[list.method](
        {
          path: FILE_KIND_API_ROUTES_SERVER.getListRoute(fileKind.id),
          validate: {
            query: list.querySchema,
          },
          options: {
            tags: fileKind.http.list.tags,
          },
        },
        list.handler
      );
    }
    if (fileKind.http.download) {
      fileKindRouter[download.method](
        {
          path: FILE_KIND_API_ROUTES_SERVER.getDownloadRoute(fileKind.id),
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
    if (fileKind.http.getById) {
      fileKindRouter[getById.method](
        {
          path: FILE_KIND_API_ROUTES_SERVER.getByIdRoute(fileKind.id),
          validate: {
            params: getById.paramsSchema,
          },
          options: {
            tags: fileKind.http.getById.tags,
          },
        },
        getById.handler
      );
    }
  });
}

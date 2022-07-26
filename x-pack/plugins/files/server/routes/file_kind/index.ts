/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FILES_API_ROUTES } from '../api_routes';
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
import * as share from './share/share';
import * as unshare from './share/unshare';
import * as listShare from './share/list';
import * as getShare from './share/get';

const fileKindApiRoutes = FILES_API_ROUTES.fileKind;

export function registerFileKindRoutes(router: FilesRouter) {
  fileKindsRegistry.getAll().forEach((fileKind) => {
    const fileKindRouter = enhanceRouter({ router, fileKind: fileKind.id });
    if (fileKind.http.create) {
      fileKindRouter[create.method](
        {
          path: fileKindApiRoutes.getCreateFileRoute(fileKind.id),
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
          path: fileKindApiRoutes.getUploadRoute(fileKind.id),
          validate: {
            body: upload.bodySchema,
            params: upload.paramsSchema,
          },
          options: {
            tags: fileKind.http.create.tags,
            body: {
              output: 'stream',
              parse: false,
              accepts: fileKind.allowedMimeTypes ?? 'application/octet-stream',
            },
          },
        },
        upload.handler
      );
    }
    if (fileKind.http.update) {
      fileKindRouter[update.method](
        {
          path: fileKindApiRoutes.getUpdateRoute(fileKind.id),
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
          path: fileKindApiRoutes.getDeleteRoute(fileKind.id),
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
          path: fileKindApiRoutes.getListRoute(fileKind.id),
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
          path: fileKindApiRoutes.getDownloadRoute(fileKind.id),
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
          path: fileKindApiRoutes.getByIdRoute(fileKind.id),
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

    if (fileKind.http.share) {
      fileKindRouter[share.method](
        {
          path: fileKindApiRoutes.getShareRoute(fileKind.id),
          validate: {
            params: share.paramsSchema,
            body: share.bodySchema,
          },
          options: {
            tags: fileKind.http.share.tags,
          },
        },
        share.handler
      );
      fileKindRouter[unshare.method](
        {
          path: fileKindApiRoutes.getUnshareRoute(fileKind.id),
          validate: {
            params: unshare.paramsSchema,
          },
          options: {
            tags: fileKind.http.share.tags,
          },
        },
        unshare.handler
      );
      fileKindRouter[getShare.method](
        {
          path: fileKindApiRoutes.getGetShareRoute(fileKind.id),
          validate: {
            params: getShare.paramsSchema,
          },
          options: {
            tags: fileKind.http.share.tags,
          },
        },
        getShare.handler
      );
      fileKindRouter[listShare.method](
        {
          path: fileKindApiRoutes.getListShareRoute(fileKind.id),
          validate: {
            query: listShare.querySchema,
          },
          options: {
            tags: fileKind.http.share.tags,
          },
        },
        listShare.handler
      );
    }
  });
}

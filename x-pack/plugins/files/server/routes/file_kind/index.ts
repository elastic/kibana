/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FILES_API_ROUTES } from '../api_routes';

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
import { getFileKindsRegistry } from '../../file_kinds_registry';

export const fileKindApiRoutes = FILES_API_ROUTES.fileKind;

export function registerFileKindRoutes(router: FilesRouter) {
  getFileKindsRegistry()
    .getAll()
    .forEach((fileKind) => {
      const fileKindRouter = enhanceRouter({ router, fileKind: fileKind.id });
      [
        create,
        upload,
        update,
        deleteEndpoint,
        list,
        download,
        getById,
        share,
        unshare,
        getShare,
        listShare,
      ].forEach((route) => {
        route.register(fileKindRouter, fileKind);
      });
    });
}

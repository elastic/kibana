/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PLUGIN_ID } from './constants';

const API_BASE_PATH = `/api/${PLUGIN_ID}`;

const FILES_API_BASE_PATH = `${API_BASE_PATH}/files`;

export const FILE_KIND_API_ROUTES = {
  getCreateFileRoute: (fileKind: string) => `${FILES_API_BASE_PATH}/${fileKind}`,
  getUploadRoute: (fileKind: string) => `${FILES_API_BASE_PATH}/${fileKind}/{fileId}/blob`,
  getDownloadRoute: (fileKind: string) =>
    `${FILES_API_BASE_PATH}/${fileKind}/{fileId}/blob/{fileName?}`,
  getUpdateRoute: (fileKind: string) => `${FILES_API_BASE_PATH}/${fileKind}/{fileId}`,
  getDeleteRoute: (fileKind: string) => `${FILES_API_BASE_PATH}/${fileKind}/{fileId}`,
  getListRoute: (fileKind: string) => `${FILES_API_BASE_PATH}/${fileKind}/list`,
  getByIdRoute: (fileKind: string) => `${FILES_API_BASE_PATH}/${fileKind}/{fileId}`,
};

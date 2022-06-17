/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PLUGIN_ID } from './constants';

const API_BASE_PATH = `/api/${PLUGIN_ID}`;

export const FILE_KIND_API_ROUTES = {
  getCreateFileRoute: (fileKind: string) => `${API_BASE_PATH}/${fileKind}/create`,
  getUploadRoute: (fileKind: string) => `${API_BASE_PATH}/${fileKind}/{fileId}/upload`,
  getUpdateRoute: (fileKind: string) => `${API_BASE_PATH}/${fileKind}/{fileId}/update`,
  getDeleteRoute: (fileKind: string) => `${API_BASE_PATH}/${fileKind}/{fileId}/delete`,
  getDownloadRoute: (fileKind: string) => `${API_BASE_PATH}/${fileKind}/{fileId}/download`,
  getListRoute: (fileKind: string) => `${API_BASE_PATH}/${fileKind}/list`,
  getFindRoute: (fileKind: string) => `${API_BASE_PATH}/${fileKind}/{fileId}`,
};

export function generateUploadPath(fileKind: string, fileId: string): string {
  return `${API_BASE_PATH}/${fileKind}/${fileId}/upload`;
}

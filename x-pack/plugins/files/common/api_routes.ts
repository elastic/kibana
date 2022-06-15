/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PLUGIN_ID } from './constants';

const API_BASE_PATH = `/api/${PLUGIN_ID}`;

export const FILE_KIND_API_ROUTES = {
  getCreateFileRoute: (fileKind: string) => `${API_BASE_PATH}/${fileKind}/create_file`,
  getUploadRoute: (fileKind: string) => `${API_BASE_PATH}/${fileKind}/{fileId}/upload`,
};

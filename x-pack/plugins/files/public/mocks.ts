/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';
import type { FilesClient } from './types';

// TODO: Remove this once we have access to the shared file client mock
export const createMockFilesClient = (): DeeplyMockedKeys<FilesClient> => ({
  create: jest.fn(),
  delete: jest.fn(),
  download: jest.fn(),
  find: jest.fn(),
  getById: jest.fn(),
  getDownloadHref: jest.fn(),
  getMetrics: jest.fn(),
  getShare: jest.fn(),
  list: jest.fn(),
  listShares: jest.fn(),
  publicDownload: jest.fn(),
  share: jest.fn(),
  unshare: jest.fn(),
  update: jest.fn(),
  upload: jest.fn(),
});

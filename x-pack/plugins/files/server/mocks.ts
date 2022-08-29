/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilesSetup, FilesStart, FileServiceStart, FileClient } from '.';

const createFileService = (): FileServiceStart => ({
  create: jest.fn(),
  delete: jest.fn(),
  deleteShareObject: jest.fn(),
  find: jest.fn(),
  getById: jest.fn(),
  getByToken: jest.fn(),
  getShareObject: jest.fn(),
  getUsageMetrics: jest.fn(),
  list: jest.fn(),
  listShareObjects: jest.fn(),
  update: jest.fn(),
  updateShareObject: jest.fn(),
});

export const filesPluginMock = {
  createSetupContractMock: (): FilesSetup => ({
    registerFileKind: jest.fn(),
  }),
  createStartContractMock: (): FilesStart => ({
    fileServiceFactory: {
      asInternal: createFileService,
      asScoped: createFileService,
    },
  }),
};

export const createFileClientMock = (fileKindId: string): FileClient => ({
  create: jest.fn(),
  delete: jest.fn(),
  fileKind: fileKindId,
  find: jest.fn(),
  get: jest.fn(),
  list: jest.fn(),
  listShares: jest.fn(),
  share: jest.fn(),
  unshare: jest.fn(),
  update: jest.fn(),
});

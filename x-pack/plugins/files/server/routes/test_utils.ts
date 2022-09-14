/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createFileServiceMock } from '../mocks';
import type { FileKindsRequestHandlerContext } from './file_kind/types';

export const createFileKindsRequestHandlerContextMock = (
  fileKind: string = 'test'
): {
  fileService: ReturnType<typeof createFileServiceMock>;
  ctx: FileKindsRequestHandlerContext;
} => {
  const fileService = createFileServiceMock();
  const ctx = {
    fileKind,
    files: Promise.resolve({
      fileService: {
        asCurrentUser: () => fileService,
        asInternalUser: () => fileService,
        logger: loggingSystemMock.createLogger(),
      },
    }),
  } as unknown as FileKindsRequestHandlerContext;

  return {
    ctx,
    fileService,
  };
};

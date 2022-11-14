/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { KibanaRequest } from '@kbn/core/server';
import { DeeplyMockedKeys } from '@kbn/utility-types-jest';
import { FileServiceFactory, FileServiceStart } from '.';

export const createFileServiceMock = (): DeeplyMockedKeys<FileServiceStart> => ({
  create: jest.fn(),
  delete: jest.fn(),
  deleteShareObject: jest.fn(),
  find: jest.fn(),
  getById: jest.fn(),
  getByToken: jest.fn(),
  getShareObject: jest.fn(),
  getUsageMetrics: jest.fn(),
  listShareObjects: jest.fn(),
  update: jest.fn(),
  updateShareObject: jest.fn(),
});

export const createFileServiceFactoryMock = (): DeeplyMockedKeys<FileServiceFactory> => ({
  asInternal: jest.fn(createFileServiceMock),
  asScoped: jest.fn((_: KibanaRequest) => createFileServiceMock()),
});

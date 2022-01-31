/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogSourceConfiguration, LogSourceStatus, useLogSource } from './log_source';

type CreateUseLogSource = (sourceConfiguration?: { sourceId?: string }) => typeof useLogSource;

const defaultSourceId = 'default';

export const createUninitializedUseLogSourceMock: CreateUseLogSource =
  ({ sourceId = defaultSourceId } = {}) =>
  () => ({
    derivedIndexPattern: {
      fields: [],
      title: 'unknown',
    },
    hasFailedLoading: false,
    hasFailedLoadingSource: false,
    hasFailedLoadingSourceStatus: false,
    hasFailedResolvingSource: false,
    initialize: jest.fn(),
    isLoading: false,
    isLoadingSourceConfiguration: false,
    isLoadingSourceStatus: false,
    isResolvingSourceConfiguration: false,
    isUninitialized: true,
    loadSource: jest.fn(),
    loadSourceConfiguration: jest.fn(),
    latestLoadSourceFailures: [],
    resolveSourceFailureMessage: undefined,
    loadSourceStatus: jest.fn(),
    sourceConfiguration: undefined,
    sourceId,
    sourceStatus: undefined,
    updateSource: jest.fn(),
    resolvedSourceConfiguration: undefined,
    loadResolveLogSourceConfiguration: jest.fn(),
  });

export const createLoadingUseLogSourceMock: CreateUseLogSource =
  ({ sourceId = defaultSourceId } = {}) =>
  (args) => ({
    ...createUninitializedUseLogSourceMock({ sourceId })(args),
    isLoading: true,
    isLoadingSourceConfiguration: true,
    isLoadingSourceStatus: true,
    isResolvingSourceConfiguration: true,
  });

export const createLoadedUseLogSourceMock: CreateUseLogSource =
  ({ sourceId = defaultSourceId } = {}) =>
  (args) => ({
    ...createUninitializedUseLogSourceMock({ sourceId })(args),
    sourceConfiguration: createBasicSourceConfiguration(sourceId),
    sourceStatus: {
      indices: 'test-index',
      logIndexStatus: 'available',
    },
  });

export const createBasicSourceConfiguration = (sourceId: string): LogSourceConfiguration => ({
  id: sourceId,
  origin: 'stored',
  configuration: {
    description: `description for ${sourceId}`,
    logIndices: {
      type: 'index_pattern',
      indexPatternId: 'some-id',
    },
    logColumns: [],
    fields: {
      message: ['MESSAGE_FIELD'],
    },
    name: sourceId,
  },
});

export const createAvailableSourceStatus = (): LogSourceStatus => ({
  indices: 'test-index',
  logIndexStatus: 'available',
});

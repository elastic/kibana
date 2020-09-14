/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LogSourceConfiguration, LogSourceStatus, useLogSource } from './log_source';

type CreateUseLogSource = (sourceConfiguration?: { sourceId?: string }) => typeof useLogSource;

const defaultSourceId = 'default';

export const createUninitializedUseLogSourceMock: CreateUseLogSource = ({
  sourceId = defaultSourceId,
} = {}) => () => ({
  derivedIndexPattern: {
    fields: [],
    title: 'unknown',
  },
  hasFailedLoadingSource: false,
  hasFailedLoadingSourceStatus: false,
  initialize: jest.fn(),
  isLoading: false,
  isLoadingSourceConfiguration: false,
  isLoadingSourceStatus: false,
  isUninitialized: true,
  loadSource: jest.fn(),
  loadSourceConfiguration: jest.fn(),
  loadSourceFailureMessage: undefined,
  loadSourceStatus: jest.fn(),
  sourceConfiguration: undefined,
  sourceId,
  sourceStatus: undefined,
  updateSourceConfiguration: jest.fn(),
});

export const createLoadingUseLogSourceMock: CreateUseLogSource = ({
  sourceId = defaultSourceId,
} = {}) => (args) => ({
  ...createUninitializedUseLogSourceMock({ sourceId })(args),
  isLoading: true,
  isLoadingSourceConfiguration: true,
  isLoadingSourceStatus: true,
});

export const createLoadedUseLogSourceMock: CreateUseLogSource = ({
  sourceId = defaultSourceId,
} = {}) => (args) => ({
  ...createUninitializedUseLogSourceMock({ sourceId })(args),
  sourceConfiguration: createBasicSourceConfiguration(sourceId),
  sourceStatus: {
    logIndexFields: [],
    logIndexStatus: 'available',
  },
});

export const createBasicSourceConfiguration = (sourceId: string): LogSourceConfiguration => ({
  id: sourceId,
  origin: 'stored',
  configuration: {
    description: `description for ${sourceId}`,
    logAlias: 'LOG_INDICES',
    logColumns: [],
    fields: {
      container: 'CONTAINER_FIELD',
      host: 'HOST_FIELD',
      pod: 'POD_FIELD',
      tiebreaker: 'TIEBREAKER_FIELD',
      timestamp: 'TIMESTAMP_FIELD',
    },
    name: sourceId,
  },
});

export const createAvailableSourceStatus = (logIndexFields = []): LogSourceStatus => ({
  logIndexFields,
  logIndexStatus: 'available',
});

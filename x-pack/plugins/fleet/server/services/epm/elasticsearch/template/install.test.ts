/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createAppContextStartContractMock } from '../../../../mocks';
import { appContextService } from '../../..';

import type { RegistryDataStream } from '../../../../types';

import { prepareTemplate } from './install';

describe('EPM index template install', () => {
  beforeEach(async () => {
    appContextService.start(createAppContextStartContractMock());
  });

  it('tests prepareTemplate to use correct priority and index_patterns for data stream with dataset_is_prefix not set', async () => {
    const dataStreamDatasetIsPrefixUnset = {
      type: 'metrics',
      dataset: 'package.dataset',
      title: 'test data stream',
      release: 'experimental',
      package: 'package',
      path: 'path',
      ingest_pipeline: 'default',
    } as RegistryDataStream;
    const pkg = {
      name: 'package',
      version: '0.0.1',
    };
    const templateIndexPatternDatasetIsPrefixUnset = 'metrics-package.dataset-*';
    const templatePriorityDatasetIsPrefixUnset = 200;
    const {
      indexTemplate: { indexTemplate },
    } = prepareTemplate({ pkg, dataStream: dataStreamDatasetIsPrefixUnset });
    expect(indexTemplate.priority).toBe(templatePriorityDatasetIsPrefixUnset);
    expect(indexTemplate.index_patterns).toEqual([templateIndexPatternDatasetIsPrefixUnset]);
  });

  it('tests prepareTemplate to use correct priority and index_patterns for data stream with dataset_is_prefix set to false', async () => {
    const dataStreamDatasetIsPrefixFalse = {
      type: 'metrics',
      dataset: 'package.dataset',
      title: 'test data stream',
      release: 'experimental',
      package: 'package',
      path: 'path',
      ingest_pipeline: 'default',
      dataset_is_prefix: false,
    } as RegistryDataStream;
    const pkg = {
      name: 'package',
      version: '0.0.1',
    };
    const templateIndexPatternDatasetIsPrefixFalse = 'metrics-package.dataset-*';
    const templatePriorityDatasetIsPrefixFalse = 200;
    const {
      indexTemplate: { indexTemplate },
    } = prepareTemplate({ pkg, dataStream: dataStreamDatasetIsPrefixFalse });

    expect(indexTemplate.priority).toBe(templatePriorityDatasetIsPrefixFalse);
    expect(indexTemplate.index_patterns).toEqual([templateIndexPatternDatasetIsPrefixFalse]);
  });

  it('tests prepareTemplate to use correct priority and index_patterns for data stream with dataset_is_prefix set to true', async () => {
    const dataStreamDatasetIsPrefixTrue = {
      type: 'metrics',
      dataset: 'package.dataset',
      title: 'test data stream',
      release: 'experimental',
      package: 'package',
      path: 'path',
      ingest_pipeline: 'default',
      dataset_is_prefix: true,
    } as RegistryDataStream;
    const pkg = {
      name: 'package',
      version: '0.0.1',
    };
    const templateIndexPatternDatasetIsPrefixTrue = 'metrics-package.dataset.*-*';
    const templatePriorityDatasetIsPrefixTrue = 150;
    const {
      indexTemplate: { indexTemplate },
    } = prepareTemplate({ pkg, dataStream: dataStreamDatasetIsPrefixTrue });

    expect(indexTemplate.priority).toBe(templatePriorityDatasetIsPrefixTrue);
    expect(indexTemplate.index_patterns).toEqual([templateIndexPatternDatasetIsPrefixTrue]);
  });
});

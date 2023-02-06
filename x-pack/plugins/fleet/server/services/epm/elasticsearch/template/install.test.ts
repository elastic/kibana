/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createAppContextStartContractMock } from '../../../../mocks';
import { appContextService } from '../../..';
import { loadFieldsFromYaml } from '../../fields/field';
import type { RegistryDataStream } from '../../../../types';

import { prepareTemplate } from './install';

jest.mock('../../fields/field', () => ({
  ...jest.requireActual('../../fields/field'),
  loadFieldsFromYaml: jest.fn(),
}));

const mockedLoadFieldsFromYaml = loadFieldsFromYaml as jest.MockedFunction<
  typeof loadFieldsFromYaml
>;

describe('EPM index template install', () => {
  beforeEach(async () => {
    appContextService.start(createAppContextStartContractMock());

    mockedLoadFieldsFromYaml.mockReturnValue([
      {
        name: 'test_dimension',
        dimension: true,
        type: 'keyword',
      },
    ]);
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

  it('tests prepareTemplate to set source mode to synthetics if specified', async () => {
    const dataStreamDatasetIsPrefixTrue = {
      type: 'metrics',
      dataset: 'package.dataset',
      title: 'test data stream',
      release: 'experimental',
      package: 'package',
      path: 'path',
      ingest_pipeline: 'default',
      dataset_is_prefix: true,
      elasticsearch: {
        source_mode: 'synthetic',
      },
    } as RegistryDataStream;
    const pkg = {
      name: 'package',
      version: '0.0.1',
    };

    const { componentTemplates } = prepareTemplate({
      pkg,
      dataStream: dataStreamDatasetIsPrefixTrue,
    });

    const packageTemplate = componentTemplates['metrics-package.dataset@package'].template;

    if (!('mappings' in packageTemplate)) {
      throw new Error('no mappings on package template');
    }

    expect(packageTemplate.mappings).toHaveProperty('_source');
    expect(packageTemplate.mappings._source).toEqual({ mode: 'synthetic' });
  });

  it('tests prepareTemplate to set source mode to synthetics if index_mode:time_series', async () => {
    const dataStreamDatasetIsPrefixTrue = {
      type: 'metrics',
      dataset: 'package.dataset',
      title: 'test data stream',
      release: 'experimental',
      package: 'package',
      path: 'path',
      ingest_pipeline: 'default',
      dataset_is_prefix: true,
      elasticsearch: {
        index_mode: 'time_series',
      },
    } as RegistryDataStream;
    const pkg = {
      name: 'package',
      version: '0.0.1',
    };

    const { componentTemplates } = prepareTemplate({
      pkg,
      dataStream: dataStreamDatasetIsPrefixTrue,
    });

    const packageTemplate = componentTemplates['metrics-package.dataset@package'].template;

    if (!('mappings' in packageTemplate)) {
      throw new Error('no mappings on package template');
    }

    expect(packageTemplate.mappings).toHaveProperty('_source');
    expect(packageTemplate.mappings._source).toEqual({ mode: 'synthetic' });
  });

  it('tests prepareTemplate to not set source mode to synthetics if index_mode:time_series and user disabled synthetic', async () => {
    const dataStreamDatasetIsPrefixTrue = {
      type: 'metrics',
      dataset: 'package.dataset',
      title: 'test data stream',
      release: 'experimental',
      package: 'package',
      path: 'path',
      ingest_pipeline: 'default',
      dataset_is_prefix: true,
      elasticsearch: {
        index_mode: 'time_series',
      },
    } as RegistryDataStream;
    const pkg = {
      name: 'package',
      version: '0.0.1',
    };

    const { componentTemplates } = prepareTemplate({
      pkg,
      dataStream: dataStreamDatasetIsPrefixTrue,
      experimentalDataStreamFeature: {
        data_stream: 'metrics-package.dataset',
        features: {
          synthetic_source: false,
          tsdb: false,
          doc_value_only_numeric: false,
          doc_value_only_other: false,
        },
      },
    });

    const packageTemplate = componentTemplates['metrics-package.dataset@package'].template;

    if (!('mappings' in packageTemplate)) {
      throw new Error('no mappings on package template');
    }

    expect(packageTemplate.mappings).not.toHaveProperty('_source');
  });

  it('tests prepareTemplate to not set source mode to synthetics if specified but user disabled it', async () => {
    const dataStreamDatasetIsPrefixTrue = {
      type: 'metrics',
      dataset: 'package.dataset',
      title: 'test data stream',
      release: 'experimental',
      package: 'package',
      path: 'path',
      ingest_pipeline: 'default',
      dataset_is_prefix: true,
      elasticsearch: {
        source_mode: 'synthetic',
      },
    } as RegistryDataStream;
    const pkg = {
      name: 'package',
      version: '0.0.1',
    };

    const { componentTemplates } = prepareTemplate({
      pkg,
      dataStream: dataStreamDatasetIsPrefixTrue,
      experimentalDataStreamFeature: {
        data_stream: 'metrics-package.dataset',
        features: {
          synthetic_source: false,
          tsdb: false,
          doc_value_only_numeric: false,
          doc_value_only_other: false,
        },
      },
    });

    const packageTemplate = componentTemplates['metrics-package.dataset@package'].template;

    if (!('mappings' in packageTemplate)) {
      throw new Error('no mappings on package template');
    }

    expect(packageTemplate.mappings).not.toHaveProperty('_source');
  });

  it('tests prepareTemplate to set index_mode time series if index_mode:time_series', async () => {
    const dataStreamDatasetIsPrefixTrue = {
      type: 'metrics',
      dataset: 'package.dataset',
      title: 'test data stream',
      release: 'experimental',
      package: 'package',
      path: 'path',
      ingest_pipeline: 'default',
      dataset_is_prefix: true,
      elasticsearch: {
        index_mode: 'time_series',
      },
    } as RegistryDataStream;
    const pkg = {
      name: 'package',
      version: '0.0.1',
    };

    const { indexTemplate } = prepareTemplate({
      pkg,
      dataStream: dataStreamDatasetIsPrefixTrue,
    });

    expect(indexTemplate.indexTemplate.template.settings).toEqual({
      index: { mode: 'time_series' },
    });
  });
});

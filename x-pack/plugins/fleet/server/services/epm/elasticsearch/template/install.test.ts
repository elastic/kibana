/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { elasticsearchServiceMock } from 'src/core/server/mocks';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { loggerMock } from '@kbn/logging-mocks';

import { createAppContextStartContractMock } from '../../../../mocks';
import { appContextService } from '../../../../services';

import type { RegistryDataStream } from '../../../../types';
import type { Field } from '../../fields/field';

import { installTemplate } from './install';

describe('EPM install', () => {
  beforeEach(async () => {
    appContextService.start(createAppContextStartContractMock());
  });

  it('tests installPackage to use correct priority and index_patterns for data stream with dataset_is_prefix not set', async () => {
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    esClient.indices.getIndexTemplate.mockImplementation(() =>
      elasticsearchServiceMock.createSuccessTransportRequestPromise({ index_templates: [] })
    );

    const fields: Field[] = [];
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
    await installTemplate({
      esClient,
      logger: loggerMock.create(),
      fields,
      dataStream: dataStreamDatasetIsPrefixUnset,
      packageVersion: pkg.version,
      packageName: pkg.name,
    });

    const sentTemplate = (
      esClient.indices.putIndexTemplate.mock.calls[0][0] as estypes.IndicesPutIndexTemplateRequest
    ).body;

    expect(sentTemplate).toBeDefined();
    expect(sentTemplate?.priority).toBe(templatePriorityDatasetIsPrefixUnset);
    expect(sentTemplate?.index_patterns).toEqual([templateIndexPatternDatasetIsPrefixUnset]);
  });

  it('tests installPackage to use correct priority and index_patterns for data stream with dataset_is_prefix set to false', async () => {
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    esClient.indices.getIndexTemplate.mockResponse({ index_templates: [] });

    const fields: Field[] = [];
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
    await installTemplate({
      esClient,
      logger: loggerMock.create(),
      fields,
      dataStream: dataStreamDatasetIsPrefixFalse,
      packageVersion: pkg.version,
      packageName: pkg.name,
    });

    const sentTemplate = (
      esClient.indices.putIndexTemplate.mock.calls[0][0] as estypes.IndicesPutIndexTemplateRequest
    ).body;

    expect(sentTemplate).toBeDefined();
    expect(sentTemplate?.priority).toBe(templatePriorityDatasetIsPrefixFalse);
    expect(sentTemplate?.index_patterns).toEqual([templateIndexPatternDatasetIsPrefixFalse]);
  });

  it('tests installPackage to use correct priority and index_patterns for data stream with dataset_is_prefix set to true', async () => {
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    esClient.indices.getIndexTemplate.mockResponse({ index_templates: [] });

    const fields: Field[] = [];
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
    await installTemplate({
      esClient,
      logger: loggerMock.create(),
      fields,
      dataStream: dataStreamDatasetIsPrefixTrue,
      packageVersion: pkg.version,
      packageName: pkg.name,
    });

    const sentTemplate = (
      esClient.indices.putIndexTemplate.mock.calls[0][0] as estypes.IndicesPutIndexTemplateRequest
    ).body;

    expect(sentTemplate).toBeDefined();
    expect(sentTemplate?.priority).toBe(templatePriorityDatasetIsPrefixTrue);
    expect(sentTemplate?.index_patterns).toEqual([templateIndexPatternDatasetIsPrefixTrue]);
  });

  it('tests installPackage remove the aliases property if the property existed', async () => {
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    esClient.indices.getIndexTemplate.mockResponse({
      index_templates: [
        {
          name: 'metrics-package.dataset',
          // @ts-expect-error not full interface
          index_template: {
            index_patterns: ['metrics-package.dataset-*'],
            template: { aliases: {} },
          },
        },
      ],
    });

    const fields: Field[] = [];
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
    await installTemplate({
      esClient,
      logger: loggerMock.create(),
      fields,
      dataStream: dataStreamDatasetIsPrefixUnset,
      packageVersion: pkg.version,
      packageName: pkg.name,
    });

    const removeAliases = (
      esClient.indices.putIndexTemplate.mock.calls[0][0] as estypes.IndicesPutIndexTemplateRequest
    ).body;
    expect(removeAliases?.template?.aliases).not.toBeDefined();

    const sentTemplate = (
      esClient.indices.putIndexTemplate.mock.calls[1][0] as estypes.IndicesPutIndexTemplateRequest
    ).body;
    expect(sentTemplate).toBeDefined();
    expect(sentTemplate?.priority).toBe(templatePriorityDatasetIsPrefixUnset);
    expect(sentTemplate?.index_patterns).toEqual([templateIndexPatternDatasetIsPrefixUnset]);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RegistryDataStream } from '../../../../types';
import { Field } from '../../fields/field';

import { elasticsearchServiceMock } from 'src/core/server/mocks';
import { installTemplate } from './install';

test('tests installPackage remove the aliases property if the property existed', async () => {
  const callCluster = elasticsearchServiceMock.createLegacyScopedClusterClient().callAsCurrentUser;
  callCluster.mockImplementation((_, params) => {
    if (params.method === 'GET' && params.path === '/_index_template/metrics-package.dataset') {
      return {
        index_templates: [
          {
            name: 'metrics-package.dataset',
            index_template: {
              index_patterns: ['metrics-package.dataset-*'],
              template: { aliases: {} },
            },
          },
        ],
      };
    }
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
    callCluster,
    fields,
    dataStream: dataStreamDatasetIsPrefixUnset,
    packageVersion: pkg.version,
    packageName: pkg.name,
  });

  // @ts-ignore
  const removeAliases = callCluster.mock.calls[1][1].body;
  expect(removeAliases.template.aliases).not.toBeDefined();
  // @ts-ignore
  const sentTemplate = callCluster.mock.calls[2][1].body;
  expect(sentTemplate).toBeDefined();
  expect(sentTemplate.priority).toBe(templatePriorityDatasetIsPrefixUnset);
  expect(sentTemplate.index_patterns).toEqual([templateIndexPatternDatasetIsPrefixUnset]);
});

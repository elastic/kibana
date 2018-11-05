/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InmemoryConfigurationAdapter } from '../configuration/inmemory_configuration_adapter';
import { PartialSourceConfiguration } from './adapter_types';
import { ConfigurationSourcesAdapter } from './configuration_sources_adapter';

describe('the ConfigurationSourcesAdapter', () => {
  test('adds the default source when no sources are configured', async () => {
    const sourcesAdapter = new ConfigurationSourcesAdapter(
      new InmemoryConfigurationAdapter({ sources: {} })
    );

    expect(await sourcesAdapter.getAll()).toMatchObject({
      default: {
        metricAlias: expect.any(String),
        fileAlias: expect.any(String),
        fields: {
          container: expect.any(String),
          host: expect.any(String),
          message: expect.arrayContaining([expect.any(String)]),
          pod: expect.any(String),
          tiebreaker: expect.any(String),
          timestamp: expect.any(String),
        },
      },
    });
  });

  test('adds missing aliases to default source when they are missing from the configuration', async () => {
    const sourcesAdapter = new ConfigurationSourcesAdapter(
      new InmemoryConfigurationAdapter({
        sources: {
          default: {} as PartialSourceConfiguration,
        },
      })
    );

    expect(await sourcesAdapter.getAll()).toMatchObject({
      default: {
        metricAlias: expect.any(String),
        fileAlias: expect.any(String),
      },
    });
  });

  test('adds missing fields to default source when they are missing from the configuration', async () => {
    const sourcesAdapter = new ConfigurationSourcesAdapter(
      new InmemoryConfigurationAdapter({
        sources: {
          default: {
            metricAlias: 'METRIC_ALIAS',
            fileAlias: 'FILE_ALIAS',
            fields: {
              container: 'DIFFERENT_CONTAINER_FIELD',
            },
          } as PartialSourceConfiguration,
        },
      })
    );

    expect(await sourcesAdapter.getAll()).toMatchObject({
      default: {
        metricAlias: 'METRIC_ALIAS',
        fileAlias: 'FILE_ALIAS',
        fields: {
          container: 'DIFFERENT_CONTAINER_FIELD',
          host: expect.any(String),
          message: expect.arrayContaining([expect.any(String)]),
          pod: expect.any(String),
          tiebreaker: expect.any(String),
          timestamp: expect.any(String),
        },
      },
    });
  });

  test('adds missing fields to non-default sources when they are missing from the configuration', async () => {
    const sourcesAdapter = new ConfigurationSourcesAdapter(
      new InmemoryConfigurationAdapter({
        sources: {
          sourceOne: {
            metricAlias: 'METRIC_ALIAS',
            fileAlias: 'FILE_ALIAS',
            fields: {
              container: 'DIFFERENT_CONTAINER_FIELD',
            },
          },
        },
      })
    );

    expect(await sourcesAdapter.getAll()).toMatchObject({
      sourceOne: {
        metricAlias: 'METRIC_ALIAS',
        fileAlias: 'FILE_ALIAS',
        fields: {
          container: 'DIFFERENT_CONTAINER_FIELD',
          host: expect.any(String),
          message: expect.arrayContaining([expect.any(String)]),
          pod: expect.any(String),
          tiebreaker: expect.any(String),
          timestamp: expect.any(String),
        },
      },
    });
  });
});

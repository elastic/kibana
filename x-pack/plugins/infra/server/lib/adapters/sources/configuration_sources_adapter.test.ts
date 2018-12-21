/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraInmemoryConfigurationAdapter } from '../configuration/inmemory_configuration_adapter';
import { PartialInfraSourceConfiguration } from './adapter_types';
import { InfraConfigurationSourcesAdapter } from './configuration_sources_adapter';

describe('the InfraConfigurationSourcesAdapter', () => {
  test('adds the default source when no sources are configured', async () => {
    const sourcesAdapter = new InfraConfigurationSourcesAdapter(
      new InfraInmemoryConfigurationAdapter({ sources: {} })
    );

    expect(await sourcesAdapter.getAll()).toMatchObject({
      default: {
        metricAlias: expect.any(String),
        logAlias: expect.any(String),
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
    const sourcesAdapter = new InfraConfigurationSourcesAdapter(
      new InfraInmemoryConfigurationAdapter({
        sources: {
          default: {} as PartialInfraSourceConfiguration,
        },
      })
    );

    expect(await sourcesAdapter.getAll()).toMatchObject({
      default: {
        metricAlias: expect.any(String),
        logAlias: expect.any(String),
      },
    });
  });

  test('adds missing fields to default source when they are missing from the configuration', async () => {
    const sourcesAdapter = new InfraConfigurationSourcesAdapter(
      new InfraInmemoryConfigurationAdapter({
        sources: {
          default: {
            metricAlias: 'METRIC_ALIAS',
            logAlias: 'LOG_ALIAS',
            fields: {
              container: 'DIFFERENT_CONTAINER_FIELD',
            },
          } as PartialInfraSourceConfiguration,
        },
      })
    );

    expect(await sourcesAdapter.getAll()).toMatchObject({
      default: {
        metricAlias: 'METRIC_ALIAS',
        logAlias: 'LOG_ALIAS',
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
    const sourcesAdapter = new InfraConfigurationSourcesAdapter(
      new InfraInmemoryConfigurationAdapter({
        sources: {
          sourceOne: {
            metricAlias: 'METRIC_ALIAS',
            logAlias: 'LOG_ALIAS',
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
        logAlias: 'LOG_ALIAS',
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

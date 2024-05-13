/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DatasetQualityPluginStart } from '@kbn/dataset-quality-plugin/public';
import { groupBy, mapValues, merge } from 'lodash';

const DATASET_TYPES = ['logs', 'metrics', 'traces', 'synthetics', 'profiling'] as const;

type DatasetType = typeof DATASET_TYPES[number];

interface Integration {
  name: string;
  title?: string;
  datasets: Record<DatasetType, Record<string, string>>;
}

async function getIntegrations({
  datasetQuality,
  signal,
}: {
  datasetQuality: DatasetQualityPluginStart;
  signal: AbortSignal;
}): Promise<Integration[]> {
  const integrations = await Promise.all(
    DATASET_TYPES.map((type) =>
      datasetQuality
        .datasetQualityAPIClient('GET /internal/dataset_quality/integrations', {
          signal,
          params: {
            query: { type },
          },
        })
        .then((response) => {
          return response.integrations.map((integration) => ({
            name: integration.name,
            title: integration.title,
            datasets: {
              [type]: integration.datasets,
            } as Record<DatasetType, Record<string, string>>,
          }));
        })
    )
  );

  const groupedByIntegrationName = groupBy(integrations.flat(), (integration) => integration.name);

  const mergedIntegrations = mapValues(groupedByIntegrationName, (integrationsInGroup) => {
    const first = integrationsInGroup[0];
    return {
      ...first,
      datasets: merge(
        {},
        ...integrationsInGroup.map((integration) => integration.datasets)
      ) as Record<DatasetType, Record<string, string>>,
    };
  });

  return Object.values(mergedIntegrations);
}

export async function getAllDatasets({
  datasetQuality,
  signal,
}: {
  datasetQuality: DatasetQualityPluginStart;
  signal: AbortSignal;
}): Promise<{ integrations: Integration[] }> {
  const [{ dataStreamsStats: _ }, integrations] = await Promise.all([
    datasetQuality.datasetQualityAPIClient('GET /internal/dataset_quality/data_streams/stats', {
      signal,
    }),
    getIntegrations({
      datasetQuality,
      signal,
    }),
  ]);

  return {
    integrations,
  };
}

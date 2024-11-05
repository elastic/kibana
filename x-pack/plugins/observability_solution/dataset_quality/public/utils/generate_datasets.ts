/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataStreamDocsStat } from '../../common/api_types';
import { DataStreamStatType } from '../../common/data_streams_stats/types';
import { mapPercentageToQuality } from '../../common/utils';
import { Integration } from '../../common/data_streams_stats/integration';
import { DataStreamStat } from '../../common/data_streams_stats/data_stream_stat';
import { DictionaryType } from '../state_machines/dataset_quality_controller/src/types';
import { flattenStats } from './flatten_stats';

export function generateDatasets(
  dataStreamStats: DataStreamStatType[] = [],
  degradedDocStats: DataStreamDocsStat[] = [],
  integrations: Integration[],
  totalDocsStats: DictionaryType<DataStreamDocsStat>
): DataStreamStat[] {
  // Check totalDocsStats first, if there are no stats, we can't generate datasets
  if (!dataStreamStats.length && !integrations.length) {
    return [];
  }

  const {
    datasetIntegrationMap,
    integrationsMap,
  }: {
    datasetIntegrationMap: Record<string, { integration: Integration; title: string }>;
    integrationsMap: Record<string, Integration>;
  } = integrations.reduce(
    (acc, integration) => {
      return {
        datasetIntegrationMap: {
          ...acc.datasetIntegrationMap,
          ...Object.keys(integration.datasets).reduce(
            (datasetsAcc, dataset) =>
              Object.assign(datasetsAcc, {
                [dataset]: {
                  integration,
                  title: integration.datasets[dataset],
                },
              }),
            {}
          ),
        },
        integrationsMap: { ...acc.integrationsMap, [integration.name]: integration },
      };
    },
    { datasetIntegrationMap: {}, integrationsMap: {} }
  );

  const totalDocs = flattenStats(totalDocsStats);
  const totalDocsMap: Record<DataStreamDocsStat['dataset'], DataStreamDocsStat['count']> =
    Object.fromEntries(totalDocs.map(({ dataset, count }) => [dataset, count]));

  if (!dataStreamStats.length) {
    return degradedDocStats.map((degradedDocStat) =>
      DataStreamStat.fromDegradedDocStat({
        degradedDocStat,
        datasetIntegrationMap,
        totalDocs: totalDocsMap[degradedDocStat.dataset],
      })
    );
  }

  const degradedMap: Record<
    DataStreamDocsStat['dataset'],
    {
      percentage: number;
      count: DataStreamDocsStat['count'];
    }
  > = degradedDocStats.reduce(
    (degradedMapAcc, { dataset, count }) =>
      Object.assign(degradedMapAcc, {
        [dataset]: {
          count,
          percentage: DataStreamStat.calculatePercentage({
            totalDocs: totalDocsMap[dataset],
            count,
          }),
        },
      }),
    {}
  );

  return dataStreamStats?.map((dataStream) => {
    const dataset = DataStreamStat.create(dataStream);

    return {
      ...dataset,
      title: datasetIntegrationMap[dataset.name]?.title || dataset.title,
      integration:
        datasetIntegrationMap[dataset.name]?.integration ??
        integrationsMap[dataStream.integration ?? ''],
      degradedDocs: degradedMap[dataset.rawName] || dataset.degradedDocs,
      docsInTimeRange: totalDocsMap[dataset.rawName] ?? 0,
      quality: mapPercentageToQuality(
        (degradedMap[dataset.rawName] || dataset.degradedDocs).percentage
      ),
    };
  });
}

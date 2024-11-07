/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_DEGRADED_DOCS } from '../../common/constants';
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

  if (!dataStreamStats.length) {
    // We want to pick up all datasets even when they don't have degraded docs
    const dataStreams = [...new Set([...Object.keys(totalDocsMap), ...Object.keys(degradedMap)])];
    return dataStreams.map((dataset) =>
      DataStreamStat.fromDegradedDocStat({
        degradedDocStat: { dataset, ...(degradedMap[dataset] || DEFAULT_DEGRADED_DOCS) },
        datasetIntegrationMap,
        totalDocs: totalDocsMap[dataset] ?? 0,
      })
    );
  }

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

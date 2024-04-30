/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataStreamStatType } from '../../common/data_streams_stats/types';
import { mapPercentageToQuality } from '../../common/utils';
import { Integration } from '../../common/data_streams_stats/integration';
import { DataStreamStat } from '../../common/data_streams_stats/data_stream_stat';
import { DegradedDocsStat } from '../../common/data_streams_stats/malformed_docs_stat';

export function generateDatasets(
  dataStreamStats: DataStreamStatType[] = [],
  degradedDocStats: DegradedDocsStat[] = [],
  integrations: Integration[]
): DataStreamStat[] {
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

  if (!dataStreamStats.length) {
    return degradedDocStats.map((degradedDocStat) =>
      DataStreamStat.fromDegradedDocStat({ degradedDocStat, datasetIntegrationMap })
    );
  }

  const degradedMap: Record<
    DegradedDocsStat['dataset'],
    {
      percentage: DegradedDocsStat['percentage'];
      count: DegradedDocsStat['count'];
      quality: DegradedDocsStat['quality'];
    }
  > = degradedDocStats.reduce(
    (degradedMapAcc, { dataset, percentage, count, quality }) =>
      Object.assign(degradedMapAcc, {
        [dataset]: {
          percentage,
          count,
          quality: mapPercentageToQuality(percentage),
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
    };
  });
}

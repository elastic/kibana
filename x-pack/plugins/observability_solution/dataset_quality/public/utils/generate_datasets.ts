/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Integration } from '../../common/data_streams_stats/integration';
import { DataStreamStat } from '../../common/data_streams_stats/data_stream_stat';
import { DegradedDocsStat } from '../../common/data_streams_stats/malformed_docs_stat';

export function generateDatasets(
  dataStreamStats: DataStreamStat[] = [],
  degradedDocStats: DegradedDocsStat[] = [],
  integrations: Integration[]
) {
  if (!dataStreamStats.length && !integrations.length) {
    return [];
  }

  const integrationMap: Record<string, { integration: Integration; title: string }> =
    integrations.reduce((integrationMapAcc, integration) => {
      return {
        ...integrationMapAcc,
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
      };
    }, {});

  if (!dataStreamStats.length) {
    return degradedDocStats.map((degradedDocStat) =>
      DataStreamStat.fromDegradedDocStat({ degradedDocStat, integrationMap })
    );
  }

  const degradedMap: Record<
    DegradedDocsStat['dataset'],
    {
      percentage: DegradedDocsStat['percentage'];
      count: DegradedDocsStat['count'];
    }
  > = degradedDocStats.reduce(
    (degradedMapAcc, { dataset, percentage, count }) =>
      Object.assign(degradedMapAcc, { [dataset]: { percentage, count } }),
    {}
  );

  return dataStreamStats?.map((dataStream) => ({
    ...dataStream,
    title: integrationMap[dataStream.name]?.title || dataStream.title,
    integration: integrationMap[dataStream.name]?.integration,
    degradedDocs: degradedMap[dataStream.rawName] || dataStream.degradedDocs,
  }));
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataStreamStat } from '../../common/data_streams_stats';
import { DegradedDocsStat } from '../../common/data_streams_stats/malformed_docs_stat';

export function mergeDegradedStatsIntoDataStreams(
  dataStreamStats: DataStreamStat[],
  degradedDocStats: DegradedDocsStat[]
) {
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
    degradedDocs: degradedMap[dataStream.rawName] || dataStream.degradedDocs,
  }));
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find, merge } from 'lodash';
import { HttpStart } from '@kbn/core/public';
import { DataStreamStat } from '../../../common/data_streams_stats/data_stream_stat';
import { DATA_STREAMS_STATS_URL } from '../../../common/constants';
import {
  GetDataStreamsStatsError,
  GetDataStreamsStatsResponse,
  GetDataStreamsStatsQuery,
  DataStreamStatServiceResponse,
} from '../../../common/data_streams_stats';
import { IDataStreamsStatsClient } from './types';

export class DataStreamsStatsClient implements IDataStreamsStatsClient {
  constructor(private readonly http: HttpStart) {}

  public async getDataStreamsStats(
    params: GetDataStreamsStatsQuery = { type: 'logs' }
  ): Promise<DataStreamStatServiceResponse> {
    const { dataStreamsStats, integrations } = await this.http
      .get<GetDataStreamsStatsResponse>(DATA_STREAMS_STATS_URL, {
        query: params,
      })
      .catch((error) => {
        throw new GetDataStreamsStatsError(`Failed to fetch data streams stats": ${error}`);
      });

    const mergedDataStreamsStats = dataStreamsStats.map((statsItem) => {
      const integration = find(integrations, { name: statsItem.integration });

      return integration ? merge({}, statsItem, { integration }) : statsItem;
    });

    return mergedDataStreamsStats.map(DataStreamStat.create);
  }
}

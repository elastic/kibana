/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import { API_VERSIONS } from '@kbn/fleet-plugin/common';
import { DataStreamStat } from '../../../common/data_streams_stats/data_stream_stat';
import { DATA_STREAMS_STATS_URL } from '../../../common/constants';
import {
  GetDataStreamsStatsError,
  GetDataStreamsStatsResponse,
  GetDataStreamsStatsQuery,
  DataStreamStatServiceResponse,
} from '../../../common/data_streams_stats';
import { IDataStreamsStatsClient } from './types';

const defaultIntegrationsParams: GetDataStreamsStatsQuery = {
  sortOrder: 'desc',
};

export class DataStreamsStatsClient implements IDataStreamsStatsClient {
  constructor(private readonly http: HttpStart) {}

  public async getDataStreamsStats(
    params: GetDataStreamsStatsQuery = defaultIntegrationsParams
  ): Promise<DataStreamStatServiceResponse> {
    const response = await this.http
      .get<GetDataStreamsStatsResponse>(DATA_STREAMS_STATS_URL, {
        query: params,
        version: API_VERSIONS.public.v1,
      })
      .catch((error) => {
        throw new GetDataStreamsStatsError(`Failed to fetch data streams stats": ${error}`);
      });

    // TODO: shel el habal dh
    return [
      ...response.items.map(DataStreamStat.create),
      ...response.items.map(DataStreamStat.create),
      ...response.items.map(DataStreamStat.create),
      ...response.items.map(DataStreamStat.create),
    ];
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import { find, merge } from 'lodash';
import {
  getDataStreamsDegradedDocsStatsResponseRt,
  getDataStreamsStatsResponseRt,
  getDataStreamsDetailsResponseRt,
} from '../../../common/api_types';
import { DEFAULT_DATASET_TYPE } from '../../../common/constants';
import {
  DataStreamStatServiceResponse,
  GetDataStreamsDegradedDocsStatsQuery,
  GetDataStreamsDegradedDocsStatsResponse,
  GetDataStreamsStatsError,
  GetDataStreamsStatsQuery,
  GetDataStreamsStatsResponse,
  GetDataStreamDetailsParams,
  GetDataStreamDetailsResponse,
} from '../../../common/data_streams_stats';
import { DataStreamDetails } from '../../../common/data_streams_stats';
import { DataStreamStat } from '../../../common/data_streams_stats/data_stream_stat';
import { IDataStreamsStatsClient } from './types';

export class DataStreamsStatsClient implements IDataStreamsStatsClient {
  constructor(private readonly http: HttpStart) {}

  public async getDataStreamsStats(
    params: GetDataStreamsStatsQuery = { type: DEFAULT_DATASET_TYPE }
  ): Promise<DataStreamStatServiceResponse> {
    const response = await this.http
      .get<GetDataStreamsStatsResponse>('/internal/dataset_quality/data_streams/stats', {
        query: params,
      })
      .catch((error) => {
        throw new GetDataStreamsStatsError(`Failed to fetch data streams stats: ${error}`);
      });

    const { dataStreamsStats, integrations } = decodeOrThrow(
      getDataStreamsStatsResponseRt,
      (message: string) =>
        new GetDataStreamsStatsError(`Failed to decode data streams stats response: ${message}`)
    )(response);

    const mergedDataStreamsStats = dataStreamsStats.map((statsItem) => {
      const integration = find(integrations, { name: statsItem.integration });

      return merge({}, statsItem, { integration });
    });

    return mergedDataStreamsStats.map(DataStreamStat.create);
  }

  public async getDataStreamsDegradedStats(params: GetDataStreamsDegradedDocsStatsQuery) {
    const response = await this.http
      .get<GetDataStreamsDegradedDocsStatsResponse>(
        '/internal/dataset_quality/data_streams/degraded_docs',
        {
          query: {
            ...params,
            type: DEFAULT_DATASET_TYPE,
          },
        }
      )
      .catch((error) => {
        throw new GetDataStreamsStatsError(`Failed to fetch data streams degraded stats: ${error}`);
      });

    const { degradedDocs } = decodeOrThrow(
      getDataStreamsDegradedDocsStatsResponseRt,
      (message: string) =>
        new GetDataStreamsStatsError(
          `Failed to decode data streams degraded docs stats response: ${message}`
        )
    )(response);

    return degradedDocs;
  }

  public async getDataStreamDetails({ dataStream }: GetDataStreamDetailsParams) {
    const response = await this.http
      .get<GetDataStreamDetailsResponse>(
        `/internal/dataset_quality/data_streams/${dataStream}/details`
      )
      .catch((error) => {
        throw new GetDataStreamsStatsError(`Failed to fetch data stream details": ${error}`);
      });

    const dataStreamDetails = decodeOrThrow(
      getDataStreamsDetailsResponseRt,
      (message: string) =>
        new GetDataStreamsStatsError(`Failed to decode data stream details response: ${message}"`)
    )(response);

    return dataStreamDetails as DataStreamDetails;
  }
}

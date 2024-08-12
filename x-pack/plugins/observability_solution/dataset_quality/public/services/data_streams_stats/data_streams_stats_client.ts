/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import {
  getDataStreamsDegradedDocsStatsResponseRt,
  getDataStreamsStatsResponseRt,
  getIntegrationsResponseRt,
  getNonAggregatableDatasetsRt,
  IntegrationResponse,
} from '../../../common/api_types';
import { DEFAULT_DATASET_TYPE } from '../../../common/constants';
import {
  DataStreamStatServiceResponse,
  GetDataStreamsDegradedDocsStatsQuery,
  GetDataStreamsDegradedDocsStatsResponse,
  GetDataStreamsStatsError,
  GetDataStreamsStatsQuery,
  GetDataStreamsStatsResponse,
  GetIntegrationsParams,
  GetNonAggregatableDataStreamsParams,
  GetNonAggregatableDataStreamsResponse,
} from '../../../common/data_streams_stats';
import { Integration } from '../../../common/data_streams_stats/integration';
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
        throw new GetDataStreamsStatsError(
          `Failed to fetch data streams stats: ${error}`,
          error.body.statusCode
        );
      });

    const { dataStreamsStats, datasetUserPrivileges } = decodeOrThrow(
      getDataStreamsStatsResponseRt,
      (message: string) =>
        new GetDataStreamsStatsError(`Failed to decode data streams stats response: ${message}`)
    )(response);

    return { dataStreamsStats, datasetUserPrivileges };
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
        throw new GetDataStreamsStatsError(
          `Failed to fetch data streams degraded stats: ${error}`,
          error.body.statusCode
        );
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

  public async getNonAggregatableDatasets(params: GetNonAggregatableDataStreamsParams) {
    const response = await this.http
      .get<GetNonAggregatableDataStreamsResponse>(
        '/internal/dataset_quality/data_streams/non_aggregatable',
        {
          query: {
            ...params,
            type: DEFAULT_DATASET_TYPE,
          },
        }
      )
      .catch((error) => {
        throw new GetDataStreamsStatsError(
          `Failed to fetch non aggregatable datasets: ${error}`,
          error.body.statusCode
        );
      });

    const nonAggregatableDatasets = decodeOrThrow(
      getNonAggregatableDatasetsRt,
      (message: string) =>
        new GetDataStreamsStatsError(`Failed to fetch non aggregatable datasets: ${message}`)
    )(response);

    return nonAggregatableDatasets;
  }

  public async getIntegrations(
    params: GetIntegrationsParams['query'] = { type: DEFAULT_DATASET_TYPE }
  ): Promise<Integration[]> {
    const response = await this.http
      .get<IntegrationResponse>('/internal/dataset_quality/integrations', {
        query: params,
      })
      .catch((error) => {
        throw new GetDataStreamsStatsError(
          `Failed to fetch integrations: ${error}`,
          error.body.statusCode
        );
      });

    const { integrations } = decodeOrThrow(
      getIntegrationsResponseRt,
      (message: string) =>
        new GetDataStreamsStatsError(`Failed to decode integrations response: ${message}`)
    )(response);

    return integrations.map(Integration.create);
  }
}

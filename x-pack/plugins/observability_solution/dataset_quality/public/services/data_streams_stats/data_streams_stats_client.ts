/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import rison from '@kbn/rison';
import { KNOWN_TYPES } from '../../../common/constants';
import {
  getDataStreamsDegradedDocsStatsResponseRt,
  getDataStreamsStatsResponseRt,
  getIntegrationsResponseRt,
  getNonAggregatableDatasetsRt,
  IntegrationResponse,
  NonAggregatableDatasets,
} from '../../../common/api_types';
import {
  DataStreamStatServiceResponse,
  GetDataStreamsDegradedDocsStatsQuery,
  GetDataStreamsDegradedDocsStatsResponse,
  GetDataStreamsStatsQuery,
  GetDataStreamsStatsResponse,
  GetNonAggregatableDataStreamsParams,
} from '../../../common/data_streams_stats';
import { Integration } from '../../../common/data_streams_stats/integration';
import { IDataStreamsStatsClient } from './types';
import { DatasetQualityError } from '../../../common/errors';

export class DataStreamsStatsClient implements IDataStreamsStatsClient {
  constructor(private readonly http: HttpStart) {}

  public async getDataStreamsStats(
    params: GetDataStreamsStatsQuery
  ): Promise<DataStreamStatServiceResponse> {
    const types = params.types.length === 0 ? KNOWN_TYPES : params.types;
    const response = await this.http
      .get<GetDataStreamsStatsResponse>('/internal/dataset_quality/data_streams/stats', {
        query: {
          ...params,
          types: rison.encodeArray(types),
        },
      })
      .catch((error) => {
        throw new DatasetQualityError(`Failed to fetch data streams stats: ${error}`, error);
      });

    const { dataStreamsStats, datasetUserPrivileges } = decodeOrThrow(
      getDataStreamsStatsResponseRt,
      (message: string) =>
        new DatasetQualityError(`Failed to decode data streams stats response: ${message}`)
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
          },
        }
      )
      .catch((error) => {
        throw new DatasetQualityError(
          `Failed to fetch data streams degraded stats: ${error}`,
          error
        );
      });

    const { degradedDocs } = decodeOrThrow(
      getDataStreamsDegradedDocsStatsResponseRt,
      (message: string) =>
        new DatasetQualityError(
          `Failed to decode data streams degraded docs stats response: ${message}`
        )
    )(response);

    return degradedDocs;
  }

  public async getNonAggregatableDatasets(params: GetNonAggregatableDataStreamsParams) {
    const response = await this.http
      .get<NonAggregatableDatasets>('/internal/dataset_quality/data_streams/non_aggregatable', {
        query: {
          ...params,
          types: rison.encodeArray(params.types),
        },
      })
      .catch((error) => {
        throw new DatasetQualityError(`Failed to fetch non aggregatable datasets: ${error}`, error);
      });

    const nonAggregatableDatasets = decodeOrThrow(
      getNonAggregatableDatasetsRt,
      (message: string) =>
        new DatasetQualityError(`Failed to fetch non aggregatable datasets: ${message}`)
    )(response);

    return nonAggregatableDatasets;
  }

  public async getIntegrations(): Promise<Integration[]> {
    const response = await this.http
      .get<IntegrationResponse>('/internal/dataset_quality/integrations')
      .catch((error) => {
        throw new DatasetQualityError(`Failed to fetch integrations: ${error}`, error);
      });

    const { integrations } = decodeOrThrow(
      getIntegrationsResponseRt,
      (message: string) =>
        new DatasetQualityError(`Failed to decode integrations response: ${message}`)
    )(response);

    return integrations.map(Integration.create);
  }
}

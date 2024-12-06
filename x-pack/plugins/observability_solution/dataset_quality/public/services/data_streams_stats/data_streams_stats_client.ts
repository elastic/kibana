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
  DataStreamDegradedDocsResponse,
  DataStreamTotalDocsResponse,
  getDataStreamDegradedDocsResponseRt,
  getDataStreamsStatsResponseRt,
  getDataStreamTotalDocsResponseRt,
  getIntegrationsResponseRt,
  getNonAggregatableDatasetsRt,
  IntegrationsResponse,
  NonAggregatableDatasets,
} from '../../../common/api_types';
import {
  DataStreamStatServiceResponse,
  GetDataStreamsDegradedDocsStatsQuery,
  GetDataStreamsStatsQuery,
  GetDataStreamsStatsResponse,
  GetDataStreamsTotalDocsQuery,
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

  public async getDataStreamsTotalDocs(params: GetDataStreamsTotalDocsQuery) {
    const response = await this.http
      .get<DataStreamTotalDocsResponse>('/internal/dataset_quality/data_streams/total_docs', {
        query: {
          ...params,
        },
      })
      .catch((error) => {
        throw new DatasetQualityError(`Failed to fetch data streams total docs: ${error}`, error);
      });

    const { totalDocs } = decodeOrThrow(
      getDataStreamTotalDocsResponseRt,
      (message: string) =>
        new DatasetQualityError(
          `Failed to decode data streams total docs stats response: ${message}`
        )
    )(response);

    return totalDocs;
  }

  public async getDataStreamsDegradedStats(params: GetDataStreamsDegradedDocsStatsQuery) {
    const types = params.types.length === 0 ? KNOWN_TYPES : params.types;
    const response = await this.http
      .get<DataStreamDegradedDocsResponse>('/internal/dataset_quality/data_streams/degraded_docs', {
        query: {
          ...params,
          types: rison.encodeArray(types),
        },
      })
      .catch((error) => {
        throw new DatasetQualityError(
          `Failed to fetch data streams degraded stats: ${error}`,
          error
        );
      });

    const { degradedDocs } = decodeOrThrow(
      getDataStreamDegradedDocsResponseRt,
      (message: string) =>
        new DatasetQualityError(
          `Failed to decode data streams degraded docs stats response: ${message}`
        )
    )(response);

    return degradedDocs;
  }

  public async getNonAggregatableDatasets(params: GetNonAggregatableDataStreamsParams) {
    const types = params.types.length === 0 ? KNOWN_TYPES : params.types;
    const response = await this.http
      .get<NonAggregatableDatasets>('/internal/dataset_quality/data_streams/non_aggregatable', {
        query: {
          ...params,
          types: rison.encodeArray(types),
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
      .get<IntegrationsResponse>('/internal/dataset_quality/integrations')
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

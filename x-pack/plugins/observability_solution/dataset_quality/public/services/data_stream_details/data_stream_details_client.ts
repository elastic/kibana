/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import {
  getDataStreamDegradedFieldsResponseRt,
  getDataStreamsDetailsResponseRt,
  getDataStreamsSettingsResponseRt,
  integrationDashboardsRT,
} from '../../../common/api_types';
import {
  DataStreamDetails,
  DataStreamSettings,
  DegradedFieldResponse,
  GetDataStreamDegradedFieldsParams,
  GetDataStreamDetailsParams,
  GetDataStreamDetailsResponse,
  GetDataStreamSettingsParams,
  GetDataStreamSettingsResponse,
  GetDataStreamsStatsError,
  GetIntegrationDashboardsParams,
  GetIntegrationDashboardsResponse,
} from '../../../common/data_streams_stats';
import { IDataStreamDetailsClient } from './types';
import { GetDataStreamsDetailsError } from '../../../common/data_stream_details';

export class DataStreamDetailsClient implements IDataStreamDetailsClient {
  constructor(private readonly http: HttpStart) {}

  public async getDataStreamSettings({ dataStream }: GetDataStreamSettingsParams) {
    const response = await this.http
      .get<GetDataStreamSettingsResponse>(
        `/internal/dataset_quality/data_streams/${dataStream}/settings`
      )
      .catch((error) => {
        throw new GetDataStreamsStatsError(
          `Failed to fetch data stream settings": ${error}`,
          error.body.statusCode
        );
      });

    const dataStreamSettings = decodeOrThrow(
      getDataStreamsSettingsResponseRt,
      (message: string) =>
        new GetDataStreamsStatsError(`Failed to decode data stream settings response: ${message}"`)
    )(response);

    return dataStreamSettings as DataStreamSettings;
  }

  public async getDataStreamDetails({ dataStream, start, end }: GetDataStreamDetailsParams) {
    const response = await this.http
      .get<GetDataStreamDetailsResponse>(
        `/internal/dataset_quality/data_streams/${dataStream}/details`,
        {
          query: { start, end },
        }
      )
      .catch((error) => {
        throw new GetDataStreamsStatsError(
          `Failed to fetch data stream details": ${error}`,
          error.body.statusCode
        );
      });

    const dataStreamDetails = decodeOrThrow(
      getDataStreamsDetailsResponseRt,
      (message: string) =>
        new GetDataStreamsStatsError(`Failed to decode data stream details response: ${message}"`)
    )(response);

    return dataStreamDetails as DataStreamDetails;
  }

  public async getDataStreamDegradedFields({
    dataStream,
    start,
    end,
  }: GetDataStreamDegradedFieldsParams) {
    const response = await this.http
      .get<DegradedFieldResponse>(
        `/internal/dataset_quality/data_streams/${dataStream}/degraded_fields`,
        {
          query: { start, end },
        }
      )
      .catch((error) => {
        throw new GetDataStreamsDetailsError(
          `Failed to fetch data stream degraded fields": ${error}`,
          error.body.statusCode
        );
      });

    return decodeOrThrow(
      getDataStreamDegradedFieldsResponseRt,
      (message: string) =>
        new GetDataStreamsDetailsError(
          `Failed to decode data stream degraded fields response: ${message}"`
        )
    )(response);
  }

  public async getIntegrationDashboards({ integration }: GetIntegrationDashboardsParams) {
    const response = await this.http
      .get<GetIntegrationDashboardsResponse>(
        `/internal/dataset_quality/integrations/${integration}/dashboards`
      )
      .catch((error) => {
        throw new GetDataStreamsStatsError(
          `Failed to fetch integration dashboards": ${error}`,
          error.body.statusCode
        );
      });

    const integrationDashboards = decodeOrThrow(
      integrationDashboardsRT,
      (message: string) =>
        new GetDataStreamsStatsError(
          `Failed to decode integration dashboards response: ${message}"`
        )
    )(response);

    return integrationDashboards;
  }
}

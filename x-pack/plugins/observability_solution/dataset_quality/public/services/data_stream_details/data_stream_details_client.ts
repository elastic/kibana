/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import {
  getDataStreamsDetailsResponseRt,
  integrationDashboardsRT,
} from '../../../common/api_types';
import {
  GetDataStreamsStatsError,
  GetDataStreamDetailsParams,
  GetDataStreamDetailsResponse,
  GetIntegrationDashboardsParams,
  GetIntegrationDashboardsResponse,
} from '../../../common/data_streams_stats';
import { DataStreamDetails } from '../../../common/data_streams_stats';
import { IDataStreamDetailsClient } from './types';

export class DataStreamDetailsClient implements IDataStreamDetailsClient {
  constructor(private readonly http: HttpStart) {}

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

  public async getIntegrationDashboards({ integration }: GetIntegrationDashboardsParams) {
    const response = await this.http
      .get<GetIntegrationDashboardsResponse>(
        `/internal/dataset_quality/integrations/${integration}/dashboards`
      )
      .catch((error) => {
        throw new GetDataStreamsStatsError(`Failed to fetch integration dashboards": ${error}`);
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

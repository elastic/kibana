/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import {
  GetDataStreamDetailsParams,
  DataStreamDetails,
  GetIntegrationDashboardsParams,
  GetIntegrationDashboardsResponse,
} from '../../../common/data_streams_stats';

export type DataStreamDetailsServiceSetup = void;

export interface DataStreamDetailsServiceStart {
  client: IDataStreamDetailsClient;
}

export interface DataStreamDetailsServiceStartDeps {
  http: HttpStart;
}

export interface IDataStreamDetailsClient {
  getDataStreamDetails(params: GetDataStreamDetailsParams): Promise<DataStreamDetails>;
  getIntegrationDashboards(
    params: GetIntegrationDashboardsParams
  ): Promise<GetIntegrationDashboardsResponse>;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import { Integration } from '../../../common/data_streams_stats/integration';
import {
  GetDataStreamSettingsParams,
  DataStreamSettings,
  GetDataStreamDetailsParams,
  DataStreamDetails,
  GetIntegrationDashboardsParams,
  GetDataStreamDegradedFieldsParams,
  DegradedFieldResponse,
} from '../../../common/data_streams_stats';
import { GetDataStreamIntegrationParams } from '../../../common/data_stream_details/types';
import { Dashboard } from '../../../common/api_types';

export type DataStreamDetailsServiceSetup = void;

export interface DataStreamDetailsServiceStart {
  client: IDataStreamDetailsClient;
}

export interface DataStreamDetailsServiceStartDeps {
  http: HttpStart;
}

export interface IDataStreamDetailsClient {
  getDataStreamSettings(params: GetDataStreamSettingsParams): Promise<DataStreamSettings>;
  getDataStreamDetails(params: GetDataStreamDetailsParams): Promise<DataStreamDetails>;
  getDataStreamDegradedFields(
    params: GetDataStreamDegradedFieldsParams
  ): Promise<DegradedFieldResponse>;
  getIntegrationDashboards(params: GetIntegrationDashboardsParams): Promise<Dashboard[]>;
  getDataStreamIntegration(
    params: GetDataStreamIntegrationParams
  ): Promise<Integration | undefined>;
}

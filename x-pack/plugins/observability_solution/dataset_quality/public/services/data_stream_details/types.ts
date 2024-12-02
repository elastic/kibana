/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import {
  GetDataStreamSettingsParams,
  DataStreamSettings,
  GetDataStreamDetailsParams,
  DataStreamDetails,
  GetIntegrationDashboardsParams,
  GetDataStreamDegradedFieldsParams,
  DegradedFieldResponse,
  GetDataStreamDegradedFieldValuesPathParams,
} from '../../../common/data_streams_stats';
import {
  AnalyzeDegradedFieldsParams,
  IntegrationType,
  CheckAndLoadIntegrationParams,
  UpdateFieldLimitParams,
} from '../../../common/data_stream_details/types';
import {
  Dashboard,
  DataStreamRolloverResponse,
  DegradedFieldAnalysis,
  DegradedFieldValues,
  UpdateFieldLimitResponse,
} from '../../../common/api_types';

export type DataStreamDetailsServiceSetup = void;

export interface DataStreamDetailsServiceStart {
  getClient: () => Promise<IDataStreamDetailsClient>;
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
  getDataStreamDegradedFieldValues(
    params: GetDataStreamDegradedFieldValuesPathParams
  ): Promise<DegradedFieldValues>;
  checkAndLoadIntegration(params: CheckAndLoadIntegrationParams): Promise<IntegrationType>;
  getIntegrationDashboards(params: GetIntegrationDashboardsParams): Promise<Dashboard[]>;
  analyzeDegradedField(params: AnalyzeDegradedFieldsParams): Promise<DegradedFieldAnalysis>;
  setNewFieldLimit(params: UpdateFieldLimitParams): Promise<UpdateFieldLimitResponse>;
  rolloverDataStream(params: { dataStream: string }): Promise<DataStreamRolloverResponse>;
}

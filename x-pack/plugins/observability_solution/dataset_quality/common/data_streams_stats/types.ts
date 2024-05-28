/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APIClientRequestParamsOf, APIReturnType } from '../rest';

export type GetDataStreamsStatsParams =
  APIClientRequestParamsOf<`GET /internal/dataset_quality/data_streams/stats`>['params'];
export type GetDataStreamsStatsQuery = GetDataStreamsStatsParams['query'];
export type GetDataStreamsStatsResponse =
  APIReturnType<`GET /internal/dataset_quality/data_streams/stats`>;
export type DataStreamStatType = GetDataStreamsStatsResponse['dataStreamsStats'][0];
export type DataStreamStatServiceResponse = DataStreamStatType[];

export type GetIntegrationsParams =
  APIClientRequestParamsOf<`GET /internal/dataset_quality/integrations`>['params'];
export type GetIntegrationsResponse = APIReturnType<`GET /internal/dataset_quality/integrations`>;
export type IntegrationType = GetIntegrationsResponse['integrations'][0];
export type IntegrationsResponse = IntegrationType[];

export type GetDataStreamsDegradedDocsStatsParams =
  APIClientRequestParamsOf<`GET /internal/dataset_quality/data_streams/degraded_docs`>['params'];
export type GetDataStreamsDegradedDocsStatsQuery = GetDataStreamsDegradedDocsStatsParams['query'];
export type GetDataStreamsDegradedDocsStatsResponse =
  APIReturnType<`GET /internal/dataset_quality/data_streams/degraded_docs`>;
export type DataStreamDegradedDocsStatServiceResponse = DegradedDocsStatType[];
export type DegradedDocsStatType = GetDataStreamsDegradedDocsStatsResponse['degradedDocs'][0];

export type GetDataStreamSettingsParams =
  APIClientRequestParamsOf<`GET /internal/dataset_quality/data_streams/{dataStream}/settings`>['params']['path'];
export type GetDataStreamSettingsResponse =
  APIReturnType<`GET /internal/dataset_quality/data_streams/{dataStream}/settings`>;

type GetDataStreamDetailsPathParams =
  APIClientRequestParamsOf<`GET /internal/dataset_quality/data_streams/{dataStream}/details`>['params']['path'];
type GetDataStreamDetailsQueryParams =
  APIClientRequestParamsOf<`GET /internal/dataset_quality/data_streams/{dataStream}/details`>['params']['query'];
export type GetDataStreamDetailsParams = GetDataStreamDetailsPathParams &
  GetDataStreamDetailsQueryParams;
export type GetDataStreamDetailsResponse =
  APIReturnType<`GET /internal/dataset_quality/data_streams/{dataStream}/details`>;

export type GetNonAggregatableDataStreamsParams =
  APIClientRequestParamsOf<`GET /internal/dataset_quality/data_streams/non_aggregatable`>['params']['query'];
export type GetNonAggregatableDataStreamsResponse =
  APIReturnType<`GET /internal/dataset_quality/data_streams/non_aggregatable`>;

export type GetIntegrationDashboardsParams =
  APIClientRequestParamsOf<`GET /internal/dataset_quality/integrations/{integration}/dashboards`>['params']['path'];
export type GetIntegrationDashboardsResponse =
  APIReturnType<`GET /internal/dataset_quality/integrations/{integration}/dashboards`>;
export type DashboardType = GetIntegrationDashboardsResponse['dashboards'][0];

export type { DataStreamStat } from './data_stream_stat';
export type { DataStreamDetails, DataStreamSettings } from '../api_types';

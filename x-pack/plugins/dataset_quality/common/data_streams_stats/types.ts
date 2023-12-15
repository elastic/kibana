/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APIClientRequestParamsOf, APIReturnType } from '../rest/create_call_dataset_quality_api';
import { DataStreamStat } from './data_stream_stat';

export type GetDataStreamsStatsParams =
  APIClientRequestParamsOf<`GET /internal/dataset_quality/data_streams/stats`>['params'];
export type GetDataStreamsStatsQuery = GetDataStreamsStatsParams['query'];
export type GetDataStreamsStatsResponse =
  APIReturnType<`GET /internal/dataset_quality/data_streams/stats`>;
export type DataStreamStatServiceResponse = DataStreamStat[];
export type IntegrationType = GetDataStreamsStatsResponse['integrations'][0];
export type DataStreamStatType = GetDataStreamsStatsResponse['dataStreamsStats'][0] & {
  integration?: IntegrationType;
};

export type GetDataStreamsDegradedDocsStatsParams =
  APIClientRequestParamsOf<`GET /internal/dataset_quality/data_streams/degraded_docs`>['params'];
export type GetDataStreamsDegradedDocsStatsQuery = GetDataStreamsDegradedDocsStatsParams['query'];
export type GetDataStreamsDegradedDocsStatsResponse =
  APIReturnType<`GET /internal/dataset_quality/data_streams/degraded_docs`>;
export type DataStreamDegradedDocsStatServiceResponse = DegradedDocsStatType[];
export type DegradedDocsStatType = GetDataStreamsDegradedDocsStatsResponse['degradedDocs'][0];

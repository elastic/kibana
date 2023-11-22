/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APIClientRequestParamsOf, APIReturnType } from '../rest/create_call_dataset_quality_api';
import { GET_DATA_STREAMS_STATS_URL } from '../constants';
import { DataStreamStat } from './data_stream_stat';

export type GetDataStreamsStatsParams = APIClientRequestParamsOf<
  typeof GET_DATA_STREAMS_STATS_URL
>['params'];
export type GetDataStreamsStatsQuery = GetDataStreamsStatsParams['query'];
export type GetDataStreamsStatsResponse = APIReturnType<typeof GET_DATA_STREAMS_STATS_URL>;
export type DataStreamStatServiceResponse = DataStreamStat[];
export type DataStreamStatType = GetDataStreamsStatsResponse['dataStreamsStats'][0];
export type IntegrationType = GetDataStreamsStatsResponse['integrations'][0];

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import {
  DataStreamDegradedDocsStatServiceResponse,
  DataStreamStatServiceResponse,
  GetDataStreamsDegradedDocsStatsQuery,
  GetDataStreamsStatsQuery,
  GetDataStreamsEstimatedDataInBytesParams,
  GetDataStreamsEstimatedDataInBytesResponse,
} from '../../../common/data_streams_stats';

export type DataStreamsStatsServiceSetup = void;

export interface DataStreamsStatsServiceStart {
  client: IDataStreamsStatsClient;
}

export interface DataStreamsStatsServiceStartDeps {
  http: HttpStart;
}

export interface IDataStreamsStatsClient {
  getDataStreamsStats(params?: GetDataStreamsStatsQuery): Promise<DataStreamStatServiceResponse>;
  getDataStreamsDegradedStats(
    params?: GetDataStreamsDegradedDocsStatsQuery
  ): Promise<DataStreamDegradedDocsStatServiceResponse>;
  getDataStreamsEstimatedDataInBytes(
    params: GetDataStreamsEstimatedDataInBytesParams
  ): Promise<GetDataStreamsEstimatedDataInBytesResponse>;
}

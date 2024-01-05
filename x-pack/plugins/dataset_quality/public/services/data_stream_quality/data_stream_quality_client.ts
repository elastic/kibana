/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import {
  CheckPlan,
  DataStreamQualityCheckArguments,
  DataStreamQualityCheckExecution,
  getDataStreamCheckPath,
  getDatastreamCheckRequestPayloadRT,
  getDatastreamCheckResponsePayloadRT,
  getDataStreamChecksPath,
  getDatastreamChecksRequestPayloadRT,
  getDatastreamChecksResponsePayloadRT,
} from '../../../common';
import { IDataStreamQualityClient } from './types';

export class DataStreamQualityClient implements IDataStreamQualityClient {
  constructor(private readonly services: { http: HttpStart }) {}

  public async getCheckPlan({
    dataStream,
    timeRange,
  }: DataStreamQualityCheckArguments): Promise<CheckPlan> {
    const response = await this.services.http.get(getDataStreamChecksPath(dataStream), {
      body: JSON.stringify(
        getDatastreamChecksRequestPayloadRT.encode({
          time_range: timeRange,
        })
      ),
    });

    return decodeOrThrow(getDatastreamChecksResponsePayloadRT)(response).plan;
  }

  public async performCheck(
    checkId: string,
    { dataStream, timeRange }: DataStreamQualityCheckArguments
  ): Promise<DataStreamQualityCheckExecution> {
    const response = await this.services.http.get(getDataStreamCheckPath(dataStream, checkId), {
      body: JSON.stringify(
        getDatastreamCheckRequestPayloadRT.encode({
          time_range: timeRange,
        })
      ),
    });

    return decodeOrThrow(getDatastreamCheckResponsePayloadRT)(response).result;
  }
}

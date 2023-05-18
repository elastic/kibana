/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import { FindDataStreamsError, FindIntegrationsError } from '../../../common/data_streams/errors';
import { decodeOrThrow } from '../../../common/runtime_types';
import {
  FindDataStreamsRequestQuery,
  findDataStreamsRequestQueryRT,
  FindDataStreamsResponse,
  findDataStreamsResponseRT,
  FindIntegrationsRequestQuery,
  findIntegrationsRequestQueryRT,
  FindIntegrationsResponse,
  findIntegrationsResponseRT,
  getDataStreamsUrl,
  getIntegrationsUrl,
} from '../../../common';

import { IDataStreamsClient } from './types';

const defaultIntegrationsParams = {
  dataStreamType: 'logs',
};

const defaultDataStreamsParams = {
  type: 'logs',
};

export class DataStreamsClient implements IDataStreamsClient {
  constructor(private readonly http: HttpStart) {}

  public async findIntegrations(
    params: FindIntegrationsRequestQuery = {}
  ): Promise<FindIntegrationsResponse> {
    const search = { ...params, ...defaultIntegrationsParams };

    const decodedSearch = decodeOrThrow(
      findIntegrationsRequestQueryRT,
      (message: string) =>
        new FindIntegrationsError(`Failed to decode integrations search param: ${message}"`)
    )(search);

    // const response = await this.http.get(getIntegrationsUrl(decodedSearch)).catch((error) => {
    //   throw new FindIntegrationsError(`Failed to fetch integrations": ${error}`);
    // });
    const response = await fetch('http://localhost:3000' + getIntegrationsUrl(decodedSearch))
      .then((res) => res.json())
      .catch((error) => {
        throw new FindIntegrationsError(`Failed to fetch integrations": ${error}`);
      });

    const data = decodeOrThrow(
      findIntegrationsResponseRT,
      (message: string) =>
        new FindIntegrationsError(`Failed to decode integrations response: ${message}"`)
    )(response);

    return data;
  }

  public async findDataStreams(
    params: FindDataStreamsRequestQuery = {}
  ): Promise<FindDataStreamsResponse> {
    const search = { ...params, ...defaultDataStreamsParams };

    const decodedSearch = decodeOrThrow(
      findDataStreamsRequestQueryRT,
      (message: string) =>
        new FindDataStreamsError(`Failed to decode data streams search param: ${message}"`)
    )(search);

    // const response = await this.http.get(getDataStreamsUrl(decodedSearch)).catch((error) => {
    //   throw new FindDataStreamsError(`Failed to fetch data streams": ${error}`);
    // });
    const response = await fetch('http://localhost:3000' + getDataStreamsUrl(decodedSearch))
      .then((res) => res.json())
      .catch((error) => {
        throw new FindDataStreamsError(`Failed to decode data streams response: ${error}"`);
      });

    const data = decodeOrThrow(
      findDataStreamsResponseRT,
      (message: string) =>
        new FindDataStreamsError(`Failed to decode data streams response: ${message}"`)
    )(response);

    return data;
  }
}

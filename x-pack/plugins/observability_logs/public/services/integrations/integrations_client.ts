/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import { decodeOrThrow } from '../../../common/runtime_types';
import {
  FindIntegrationsRequestQuery,
  findIntegrationsRequestQueryRT,
  FindIntegrationsResponse,
  findIntegrationsResponseRT,
  getIntegrationsUrl,
} from '../../../common';

import { IIntegrationsClient } from './types';

export class IntegrationsClient implements IIntegrationsClient {
  constructor(private readonly http: HttpStart) {}

  public async findIntegrations(
    params: FindIntegrationsRequestQuery = {}
  ): Promise<FindIntegrationsResponse> {
    const search = decodeOrThrow(
      findIntegrationsRequestQueryRT,
      (message: string) => new Error(`Failed to decode integrations search param: ${message}"`)
    )(params);

    const response = await this.http.get(getIntegrationsUrl(search)).catch((error) => {
      throw new Error(`Failed to fetch integrations": ${error}`);
    });

    const data = decodeOrThrow(
      findIntegrationsResponseRT,
      (message: string) => new Error(`Failed to decode integrations response: ${message}"`)
    )(response);

    return data;
  }
}

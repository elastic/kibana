/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import { decodeOrThrow } from '@kbn/infra-plugin/common/runtime_types';
import {
  FindIntegrationsRequestQuery,
  FindIntegrationsResponse,
  findIntegrationsResponseRT,
  getIntegrationsUrl,
} from '../../../common';

import { IIntegrationsClient } from './types';

export class IntegrationsClient implements IIntegrationsClient {
  constructor(private readonly http: HttpStart) {}

  public async findIntegrations(
    params: FindIntegrationsRequestQuery
  ): Promise<FindIntegrationsResponse> {
    const response = await this.http.get(getIntegrationsUrl(params)).catch((error) => {
      throw new Error(`Failed to fetch integrations": ${error}`);
    });

    const data = decodeOrThrow(
      findIntegrationsResponseRT,
      (message: string) => new Error(`Failed to decode integrations response: ${message}"`)
    )(response);

    return data;
  }
}

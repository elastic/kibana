/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import {
  DATASETS_URL,
  FindDatasetsRequestQuery,
  findDatasetsRequestQueryRT,
  FindDatasetsResponse,
  findDatasetsResponseRT,
  FindIntegrationsRequestQuery,
  findIntegrationsRequestQueryRT,
  FindIntegrationsResponse,
  findIntegrationsResponseRT,
  formatSearch,
  INTEGRATIONS_URL,
} from '../../../common/latest';
import { FindDatasetsError, FindIntegrationsError } from '../../../common/datasets/errors';
import { decodeOrThrow } from '../../../common/runtime_types';
import { IDatasetsClient } from './types';

const defaultIntegrationsParams = {
  datasetType: 'logs',
};

const defaultDatasetsParams = {
  type: 'logs',
  uncategorisedOnly: true,
};

export class DatasetsClient implements IDatasetsClient {
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

    const query = formatSearch(decodedSearch);

    const response = await this.http.get(INTEGRATIONS_URL, { query }).catch((error) => {
      throw new FindIntegrationsError(`Failed to fetch integrations": ${error}`);
    });

    const data = decodeOrThrow(
      findIntegrationsResponseRT,
      (message: string) =>
        new FindIntegrationsError(`Failed to decode integrations response: ${message}"`)
    )(response);

    return data;
  }

  public async findDatasets(params: FindDatasetsRequestQuery = {}): Promise<FindDatasetsResponse> {
    const search = { ...params, ...defaultDatasetsParams };

    const decodedSearch = decodeOrThrow(
      findDatasetsRequestQueryRT,
      (message: string) =>
        new FindDatasetsError(`Failed to decode data streams search param: ${message}"`)
    )(search);

    const query = formatSearch(decodedSearch);

    const response = await this.http.get(DATASETS_URL, { query }).catch((error) => {
      throw new FindDatasetsError(`Failed to fetch data streams": ${error}`);
    });

    const data = decodeOrThrow(
      findDatasetsResponseRT,
      (message: string) =>
        new FindDatasetsError(`Failed to decode data streams response: ${message}"`)
    )(response);

    return data;
  }
}

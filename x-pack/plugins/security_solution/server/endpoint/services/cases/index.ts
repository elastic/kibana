/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesClient } from '@kbn/cases-plugin/server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { EndpointAppContext } from '../../types';
import type { CreateActionPayload } from '../actions/create/types';
import { updateCases } from './cases';
import type { EndpointCasesServiceInterface } from './types';

export class EndpointCasesService implements EndpointCasesServiceInterface {
  constructor(private esClient: ElasticsearchClient, private endpointContext: EndpointAppContext) {}

  async update({
    casesClient,
    createActionPayload,
  }: {
    casesClient?: CasesClient;
    createActionPayload: CreateActionPayload;
  }): Promise<void> {
    const endpointData = await this.endpointContext.service
      .getEndpointMetadataService()
      .getMetadataForEndpoints(this.esClient, [...new Set(createActionPayload.endpoint_ids)]);

    return updateCases({ endpointData, createActionPayload, casesClient });
  }
}

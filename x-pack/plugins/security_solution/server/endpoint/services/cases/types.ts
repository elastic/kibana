/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesClient } from '@kbn/cases-plugin/server';
import type { CreateActionPayload } from '../actions/create/types';

export interface EndpointCasesServiceInterface {
  update: ({
    casesClient,
    createActionPayload,
    endpointIds,
  }: {
    casesClient?: CasesClient;
    createActionPayload: CreateActionPayload;
    endpointIds: string[];
  }) => Promise<void>;
}

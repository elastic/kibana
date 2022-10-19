/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicContract } from '@kbn/utility-types';
import { ESSearchRequest, ESSearchResponse } from '@kbn/es-types';
import type { SearchRequest } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { IRuleDataClient } from '../rule_data_client';

interface CreateGetSummarizedAlertsFnOpts {
  ruleDataClient: PublicContract<IRuleDataClient>;
  useNamespace: boolean;
}

export const createGetSummarizedAlertsFn =
  (opts: CreateGetSummarizedAlertsFnOpts) =>
  () =>
  async <TSearchRequest extends ESSearchRequest>(start: Date, end: Date, spaceId: string) => {
    const { ruleDataClient, useNamespace } = opts;
    const ruleDataClientReader = useNamespace
      ? ruleDataClient.getReader({ namespace: spaceId })
      : ruleDataClient.getReader();
    // build query using start and end parameters
    return (await ruleDataClientReader.search({} as SearchRequest)) as ESSearchResponse<
      Partial<unknown>,
      TSearchRequest
    >;
  };

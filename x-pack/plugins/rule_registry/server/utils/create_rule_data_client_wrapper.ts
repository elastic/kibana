/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicContract } from '@kbn/utility-types';
import type { SearchRequest } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { IRuleDataClient } from '../rule_data_client';

interface CreateRuleDataSearchWrapperOpts {
  ruleDataClient: PublicContract<IRuleDataClient>;
  useNamespace: boolean;
}

export const createRuleDataSearchWrapper =
  (opts: CreateRuleDataSearchWrapperOpts) =>
  () =>
  async (request: SearchRequest, spaceId: string) => {
    const { ruleDataClient, useNamespace } = opts;
    const ruleDataClientReader = useNamespace
      ? ruleDataClient.getReader({ namespace: spaceId })
      : ruleDataClient.getReader();
    return await ruleDataClientReader.search(request);
  };

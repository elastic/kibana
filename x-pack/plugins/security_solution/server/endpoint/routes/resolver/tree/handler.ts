/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
import type { RuleRegistryPluginStartContract } from '@kbn/rule-registry-plugin/server';
import type { validateTree } from '../../../../../common/endpoint/schema/resolver';
import type { ConfigType } from '../../../../config';
import { Fetcher } from './utils/fetch';

export function handleTree(
  ruleRegistry: RuleRegistryPluginStartContract,
  config: ConfigType
): RequestHandler<unknown, unknown, TypeOf<typeof validateTree.body>> {
  return async (context, req, res) => {
    const client = (await context.core).elasticsearch.client;
    const {
      experimentalFeatures: { insightsRelatedAlertsByProcessAncestry },
    } = config;
    const alertsClient = insightsRelatedAlertsByProcessAncestry
      ? await ruleRegistry.getRacClientWithRequest(req)
      : undefined;
    const fetcher = new Fetcher(client, alertsClient);
    const body = await fetcher.tree(req.body);
    return res.ok({
      body,
    });
  };
}

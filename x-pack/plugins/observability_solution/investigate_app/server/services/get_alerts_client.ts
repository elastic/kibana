/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { ESSearchRequest, InferSearchResponseOf } from '@kbn/es-types';
import { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import {
  APM_RULE_TYPE_IDS,
  INFRA_RULE_TYPE_IDS,
  LOG_RULE_TYPE_IDS,
  SLO_RULE_TYPE_IDS,
  UPTIME_RULE_TYPE_IDS,
} from '@kbn/rule-data-utils';
import { InvestigateAppRouteHandlerResources } from '../routes/types';

export type AlertsClient = Awaited<ReturnType<typeof getAlertsClient>>;

export async function getAlertsClient({
  plugins,
  request,
}: Pick<InvestigateAppRouteHandlerResources, 'plugins' | 'request'>) {
  const ruleRegistryPluginStart = await plugins.ruleRegistry.start();
  const alertsClient = await ruleRegistryPluginStart.getRacClientWithRequest(request);
  const alertsIndices = await alertsClient.getAuthorizedAlertsIndices([
    ...LOG_RULE_TYPE_IDS,
    ...INFRA_RULE_TYPE_IDS,
    ...APM_RULE_TYPE_IDS,
    ...SLO_RULE_TYPE_IDS,
    ...UPTIME_RULE_TYPE_IDS,
  ]);

  if (!alertsIndices || isEmpty(alertsIndices)) {
    throw Error('No alert indices exist');
  }

  type RequiredParams = ESSearchRequest & {
    size: number;
    track_total_hits: boolean | number;
  };

  return {
    search<TParams extends RequiredParams>(
      searchParams: TParams
    ): Promise<InferSearchResponseOf<ParsedTechnicalFields, TParams>> {
      return alertsClient.find({
        ...searchParams,
        index: alertsIndices.join(','),
      }) as Promise<any>;
    },
  };
}

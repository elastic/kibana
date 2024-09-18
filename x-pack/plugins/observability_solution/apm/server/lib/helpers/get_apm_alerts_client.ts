/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { ESSearchRequest, InferSearchResponseOf } from '@kbn/es-types';
import { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import { IndexLifeCycleDataTier } from '@kbn/observability-shared-plugin/common';
import { searchExcludedDataTiers } from '@kbn/observability-plugin/common/ui_settings_keys';
import { estypes } from '@elastic/elasticsearch';
import { getDataTierFilterCombined } from '@kbn/apm-data-access-plugin/server/utils';
import type { MinimalAPMRouteHandlerResources } from '../../routes/apm_routes/register_apm_server_routes';

export type ApmAlertsClient = Awaited<ReturnType<typeof getApmAlertsClient>>;

export type ApmAlertsRequiredParams = ESSearchRequest & {
  size: number;
  track_total_hits: boolean | number;
  query?: estypes.QueryDslQueryContainer;
};

export async function getApmAlertsClient({
  context,
  plugins,
  request,
}: Pick<MinimalAPMRouteHandlerResources, 'context' | 'plugins' | 'request'>) {
  const coreContext = await context.core;

  const ruleRegistryPluginStart = await plugins.ruleRegistry.start();
  const alertsClient = await ruleRegistryPluginStart.getRacClientWithRequest(request);
  const apmAlertsIndices = await alertsClient.getAuthorizedAlertsIndices(['apm']);

  if (!apmAlertsIndices || isEmpty(apmAlertsIndices)) {
    throw Error('No alert indices exist for "apm"');
  }

  const excludedDataTiers = await coreContext.uiSettings.client.get<IndexLifeCycleDataTier[]>(
    searchExcludedDataTiers
  );

  return {
    search<TParams extends ApmAlertsRequiredParams>(
      searchParams: TParams
    ): Promise<InferSearchResponseOf<ParsedTechnicalFields, TParams>> {
      return alertsClient.find({
        ...searchParams,
        query: getDataTierFilterCombined({
          filter: searchParams.query,
          excludedDataTiers,
        }),
        index: apmAlertsIndices.join(','),
      }) as Promise<any>;
    },
  };
}

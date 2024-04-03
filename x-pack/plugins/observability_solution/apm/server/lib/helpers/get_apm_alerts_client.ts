/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { ESSearchRequest, InferSearchResponseOf } from '@kbn/es-types';
import { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import { APMRouteHandlerResources } from '../../routes/apm_routes/register_apm_server_routes';

export type ApmAlertsClient = Awaited<ReturnType<typeof getApmAlertsClient>>;

export async function getApmAlertsClient({
  plugins,
  request,
}: APMRouteHandlerResources) {
  const ruleRegistryPluginStart = await plugins.ruleRegistry.start();
  const alertsClient = await ruleRegistryPluginStart.getRacClientWithRequest(
    request
  );
  const apmAlertsIndices = await alertsClient.getAuthorizedAlertsIndices([
    'apm',
  ]);

  if (!apmAlertsIndices || isEmpty(apmAlertsIndices)) {
    throw Error('No alert indices exist for "apm"');
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
        index: apmAlertsIndices.join(','),
      }) as Promise<any>;
    },
  };
}

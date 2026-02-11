/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { SLO_RULE_TYPE_IDS } from '@kbn/rule-data-utils';
import type { AlertsClient } from '@kbn/rule-registry-plugin/server';
import type { MinimalAPMRouteHandlerResources } from '../../routes/apm_routes/register_apm_server_routes';

export interface SloAlertsClient {
  alertsClient: AlertsClient;
  sloAlertsIndices: string[];
}

export async function getSloAlertsClient({
  plugins,
  request,
}: Pick<MinimalAPMRouteHandlerResources, 'plugins' | 'request'>): Promise<
  SloAlertsClient | undefined
> {
  const ruleRegistryPluginStart = await plugins.ruleRegistry.start();
  const alertsClient = await ruleRegistryPluginStart.getRacClientWithRequest(request);
  const sloAlertsIndices = await alertsClient.getAuthorizedAlertsIndices(SLO_RULE_TYPE_IDS);

  if (!sloAlertsIndices || isEmpty(sloAlertsIndices)) {
    return undefined;
  }

  return {
    alertsClient,
    sloAlertsIndices,
  };
}

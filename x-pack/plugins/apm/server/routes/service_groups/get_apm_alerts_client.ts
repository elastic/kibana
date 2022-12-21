/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { APMRouteHandlerResources } from '../typings';

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

  type ApmAlertsClientSearchParams = Omit<
    Parameters<typeof alertsClient.find>[0],
    'index'
  >;

  return {
    search(searchParams: ApmAlertsClientSearchParams) {
      return alertsClient.find({
        ...searchParams,
        index: apmAlertsIndices.join(','),
      });
    },
  };
}

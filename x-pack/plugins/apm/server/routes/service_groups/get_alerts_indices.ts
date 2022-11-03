/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APMRouteHandlerResources } from '../../routes/typings';

export async function getAlertsIndices({
  plugins,
  request,
}: APMRouteHandlerResources) {
  const ruleRegistryPluginStart = await plugins.ruleRegistry.start();
  const alertsClient = await ruleRegistryPluginStart.getRacClientWithRequest(
    request
  );
  return alertsClient.getAuthorizedAlertsIndices(['apm']);
}

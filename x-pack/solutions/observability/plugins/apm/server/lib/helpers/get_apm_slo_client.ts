/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SloClient } from '@kbn/slo-plugin/server';
import type { MinimalAPMRouteHandlerResources } from '../../routes/apm_routes/register_apm_server_routes';

export type ApmSloClient = SloClient;

export async function getApmSloClient({
  plugins,
  request,
}: Pick<MinimalAPMRouteHandlerResources, 'plugins' | 'request'>): Promise<
  ApmSloClient | undefined
> {
  const sloStart = await plugins.slo?.start();

  if (!sloStart) {
    return undefined;
  }

  return sloStart.getSloClientWithRequest(request);
}

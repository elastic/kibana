/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core/server';
import { INTEGRATIONS_PLUGIN_ID, PLUGIN_ID as FLEET_PLUGIN_ID } from '@kbn/fleet-plugin/common';
import { ProfilingPluginStartDeps } from '../../types';

export async function getHasSetupPrivileges({
  securityPluginStart,
  request,
}: {
  securityPluginStart: NonNullable<ProfilingPluginStartDeps['security']>;
  request: KibanaRequest;
}) {
  const { hasAllRequested } = await securityPluginStart.authz
    .checkPrivilegesWithRequest(request)
    .globally({
      elasticsearch: {
        cluster: ['manage', 'monitor'],
        index: {
          'profiling-*': ['read'],
        },
      },
      kibana: [
        securityPluginStart.authz.actions.api.get(`${FLEET_PLUGIN_ID}-all`),
        securityPluginStart.authz.actions.api.get(`${INTEGRATIONS_PLUGIN_ID}-all`),
      ],
    });
  return hasAllRequested;
}

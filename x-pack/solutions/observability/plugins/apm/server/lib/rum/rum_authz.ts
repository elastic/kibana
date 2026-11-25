/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { KibanaRequest } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';

/**
 * Ensures the user can write APM settings in every space. The RUM policy is deployment-wide,
 * while `apm_settings_write` can be granted in a single space.
 */
export const assertDeploymentWideRumWrite = async (
  authz: SecurityPluginStart['authz'] | undefined,
  request: KibanaRequest
): Promise<void> => {
  // Without RBAC, routes do not enforce Kibana privileges either.
  if (!authz || !authz.mode.useRbacForRequest(request)) {
    return;
  }
  const { hasAllRequested } = await authz.checkPrivilegesWithRequest(request).globally({
    kibana: [authz.actions.api.get('apm'), authz.actions.api.get('apm_settings_write')],
  });
  if (!hasAllRequested) {
    throw Boom.forbidden('Managed RUM settings require APM settings write access in all spaces');
  }
};

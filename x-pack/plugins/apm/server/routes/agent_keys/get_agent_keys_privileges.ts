/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApmPluginRequestHandlerContext } from '../typings';
import { APMPluginStartDependencies } from '../../types';

export async function getAgentKeysPrivileges({
  context,
  securityPluginStart,
}: {
  context: ApmPluginRequestHandlerContext;
  securityPluginStart: NonNullable<APMPluginStartDependencies['security']>;
}) {
  const [securityHasPrivilegesResponse, areApiKeysEnabled] = await Promise.all([
    context.core.elasticsearch.client.asCurrentUser.security.hasPrivileges({
      body: {
        cluster: ['manage_security', 'manage_api_key', 'manage_own_api_key'],
      },
    }),
    securityPluginStart.authc.apiKeys.areAPIKeysEnabled(),
  ]);

  const {
    cluster: {
      manage_security: manageSecurity,
      manage_api_key: manageApiKey,
      manage_own_api_key: manageOwnApiKey,
    },
  } = securityHasPrivilegesResponse;

  const isAdmin = manageSecurity || manageApiKey;
  const canManage = manageSecurity || manageApiKey || manageOwnApiKey;

  return {
    areApiKeysEnabled,
    isAdmin,
    canManage,
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, Logger } from '@kbn/core/server';

import { SecurityPluginSetup } from '@kbn/security-plugin/server';
import { SpacesPluginStart } from '@kbn/spaces-plugin/server';

import { ConfigType } from '..';
import { ProductAccess } from '../../common/types';

import { callEnterpriseSearchConfigAPI } from './enterprise_search_config_api';

interface CheckAccess {
  request: KibanaRequest;
  security: SecurityPluginSetup;
  spaces: SpacesPluginStart;
  config: ConfigType;
  log: Logger;
}

const ALLOW_ALL_PLUGINS = {
  hasAppSearchAccess: true,
  hasWorkplaceSearchAccess: true,
};
const DENY_ALL_PLUGINS = {
  hasAppSearchAccess: false,
  hasWorkplaceSearchAccess: false,
};

/**
 * Determines whether the user has access to our Enterprise Search products
 * via HTTP call. If not, we hide the corresponding plugin links from the
 * nav and catalogue in `plugin.ts`, which disables plugin access
 */
export const checkAccess = async ({
  config,
  security,
  spaces,
  request,
  log,
}: CheckAccess): Promise<ProductAccess> => {
  const isRbacEnabled = security.authz.mode.useRbacForRequest(request);

  // If security has been disabled, always hide the plugin
  if (!isRbacEnabled) {
    return DENY_ALL_PLUGINS;
  }

  // We can only retrieve the active space when security is enabled and the request has already been authenticated
  const attemptSpaceRetrieval = request.auth.isAuthenticated;
  let allowedAtSpace = false;

  if (attemptSpaceRetrieval) {
    try {
      const space = await spaces.spacesService.getActiveSpace(request);
      allowedAtSpace = !space.disabledFeatures?.includes('enterpriseSearch');
    } catch (err) {
      if (err?.output?.statusCode === 403) {
        allowedAtSpace = false;
      } else {
        throw err;
      }
    }
  }

  // Hide the plugin if turned off in the current space.
  if (!allowedAtSpace) {
    return DENY_ALL_PLUGINS;
  }

  // If the user is a "superuser" or has the base Kibana all privilege globally, always show the plugin
  const isSuperUser = async (): Promise<boolean> => {
    try {
      const { hasAllRequested } = await security.authz
        .checkPrivilegesWithRequest(request)
        .globally({ kibana: security.authz.actions.ui.get('enterpriseSearch', 'all') });
      return hasAllRequested;
    } catch (err) {
      if (err.statusCode === 401 || err.statusCode === 403) {
        return false;
      }
      throw err;
    }
  };
  if (await isSuperUser()) {
    return ALLOW_ALL_PLUGINS;
  }

  // Hide the plugin when enterpriseSearch.host is not defined in kibana.yml
  if (!config.host) {
    return DENY_ALL_PLUGINS;
  }

  // When enterpriseSearch.host is defined in kibana.yml,
  // make a HTTP call which returns product access
  const { access } = (await callEnterpriseSearchConfigAPI({ request, config, log })) || {};
  return access || DENY_ALL_PLUGINS;
};

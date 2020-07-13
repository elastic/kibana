/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest, Logger } from 'src/core/server';
import { SecurityPluginSetup } from '../../../security/server';
import { ConfigType } from '../';

import { callEnterpriseSearchConfigAPI } from './enterprise_search_config_api';

interface ICheckAccess {
  request: KibanaRequest;
  security?: SecurityPluginSetup;
  config: ConfigType;
  log: Logger;
}
export interface IAccess {
  hasAppSearchAccess: boolean;
  hasWorkplaceSearchAccess: boolean;
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
  request,
  log,
}: ICheckAccess): Promise<IAccess> => {
  // If security has been disabled, always show the plugin
  if (!security?.authz.mode.useRbacForRequest(request)) {
    return ALLOW_ALL_PLUGINS;
  }

  // If the user is a "superuser" or has the base Kibana all privilege globally, always show the plugin
  const isSuperUser = async (): Promise<boolean> => {
    try {
      const { hasAllRequested } = await security.authz
        .checkPrivilegesWithRequest(request)
        .globally(security.authz.actions.ui.get('enterpriseSearch', 'all'));
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

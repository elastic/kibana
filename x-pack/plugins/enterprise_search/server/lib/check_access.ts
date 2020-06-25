/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import AbortController from 'abort-controller';
import fetch from 'node-fetch';

import { KibanaRequest, Logger } from 'src/core/server';
import { SecurityPluginSetup } from '../../../security/server';
import { ServerConfigType } from '../plugin';

interface ICheckAccess {
  enterpriseSearchPath: 'as' | 'ws';
  request: KibanaRequest;
  security?: SecurityPluginSetup;
  config: ServerConfigType;
  log: Logger;
}
type TTimeout = ReturnType<typeof setTimeout>;

/**
 * Determines whether the user has access to our Enterprise Search products
 * via HTTP call. If not, we hide the corresponding plugin links from the
 * nav and catalogue in `plugin.ts`, which disables plugin access
 */
export const checkAccess = async ({
  enterpriseSearchPath,
  config,
  security,
  request,
  log,
}: ICheckAccess): Promise<boolean> => {
  // If security has been disabled, always show the plugin
  if (!security?.authz?.mode.useRbacForRequest(request)) {
    return true;
  }

  // If the user is a "superuser" or has the base Kibana all privilege globally, always show the plugin
  const isSuperUser = async () => {
    try {
      const { hasAllRequested } = await security.authz
        .checkPrivilegesWithRequest(request)
        .globally(security.authz.actions.ui.get('enterprise_search', 'app_search'));
      return hasAllRequested;
    } catch (err) {
      return false;
    }
  };
  if (await isSuperUser()) {
    return true;
  }

  // Hide the plugin when enterpriseSearch.host is not defined in kibana.yml
  if (!config.host) {
    return false;
  }

  // When enterpriseSearch.host is defined in kibana.yml
  let timeout: TTimeout;
  try {
    // Timeout if the remote call to Enterprise Search takes too long
    const controller = new AbortController();
    timeout = setTimeout(() => {
      controller.abort();
    }, config.accessCheckTimeout);

    const enterpriseSearchUrl = `${config.host!}/${enterpriseSearchPath}`;
    const response = await fetch(enterpriseSearchUrl, {
      headers: { Authorization: request.headers.authorization as string },
      signal: controller.signal,
    });

    // Check for a redirect - if so, that means the user doesn't have access
    if (response.url.endsWith('/login') || response.url.endsWith('/select')) {
      return false;
    }
    // Otherwise, the user has access and we can show the plugin
    return response.ok;
  } catch (err) {
    // If any errors occur, hide the plugin
    if (err.name === 'AbortError') {
      const message = `Exceeded timeout while checking ${config.host} for user access. Please consider increasing your enterpriseSearch.accessCheckTimeout value so that users aren't prevented from accessing Enterprise Search plugins due to slow responses.`;
      log.warn(message);
    } else {
      const message = `Could not perform access check to Enterprise Search: ${err.toString()}`;
      log.error(message);
      if (err instanceof Error) log.debug(err.stack as string);
    }
    return false;
  } finally {
    clearTimeout(timeout! as TTimeout);
  }
};

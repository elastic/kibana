/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import AbortController from 'abort-controller';
import fetch from 'node-fetch';

import { KibanaRequest, Logger } from 'src/core/server';
import { ConfigType } from '../';
import { IAccess } from './check_access';

interface IParams {
  request: KibanaRequest;
  config: ConfigType;
  log: Logger;
}
interface IReturn {
  publicUrl?: string;
  access?: IAccess;
}

/**
 * Calls an internal Enterprise Search API endpoint which returns
 * useful various settings (e.g. product access, external URL)
 * needed by the Kibana plugin at the setup stage
 */
const ENDPOINT = '/api/ent/v1/internal/client_config';

export const callEnterpriseSearchConfigAPI = async ({
  config,
  log,
  request,
}: IParams): Promise<IReturn> => {
  if (!config.host) return {};

  const TIMEOUT_WARNING = `Enterprise Search access check took over ${config.accessCheckTimeoutWarning}ms. Please ensure your Enterprise Search server is respondingly normally and not adversely impacting Kibana load speeds.`;
  const TIMEOUT_MESSAGE = `Exceeded ${config.accessCheckTimeout}ms timeout while checking ${config.host}. Please consider increasing your enterpriseSearch.accessCheckTimeout value so that users aren't prevented from accessing Enterprise Search plugins due to slow responses.`;
  const CONNECTION_ERROR = 'Could not perform access check to Enterprise Search';

  const warningTimeout = setTimeout(() => {
    log.warn(TIMEOUT_WARNING);
  }, config.accessCheckTimeoutWarning);

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, config.accessCheckTimeout);

  try {
    const enterpriseSearchUrl = encodeURI(`${config.host}${ENDPOINT}`);
    const response = await fetch(enterpriseSearchUrl, {
      headers: { Authorization: request.headers.authorization as string },
      signal: controller.signal,
    });
    const data = await response.json();

    return {
      publicUrl: data?.settings?.external_url,
      access: {
        hasAppSearchAccess: !!data?.access?.products?.app_search,
        hasWorkplaceSearchAccess: !!data?.access?.products?.workplace_search,
      },
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      log.warn(TIMEOUT_MESSAGE);
    } else {
      log.error(`${CONNECTION_ERROR}: ${err.toString()}`);
      if (err instanceof Error) log.debug(err.stack as string);
    }
    return {};
  } finally {
    clearTimeout(warningTimeout);
    clearTimeout(timeout);
  }
};

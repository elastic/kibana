/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import AbortController from 'abort-controller';
import fetch from 'node-fetch';

import { KibanaRequest, Logger } from 'src/core/server';
import { ServerConfigType } from '../plugin';
import { IAccess } from './check_access';

interface IParams {
  request: KibanaRequest;
  config: ServerConfigType;
  log: Logger;
}
interface IReturn {
  publicUrl?: string;
  access?: IAccess;
}
type TTimeout = ReturnType<typeof setTimeout>;

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

  let timeout: TTimeout;
  try {
    // Timeout if the remote call to Enterprise Search takes too long
    const controller = new AbortController();
    timeout = setTimeout(() => {
      controller.abort();
    }, config.accessCheckTimeout);

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
      const message = `Exceeded ${config.accessCheckTimeout}ms timeout while checking ${config.host}. Please consider increasing your enterpriseSearch.accessCheckTimeout value so that users aren't prevented from accessing Enterprise Search plugins due to slow responses.`;
      log.warn(message);
    } else {
      const message = `Could not perform access check to Enterprise Search: ${err.toString()}`;
      log.error(message);
      if (err instanceof Error) log.debug(err.stack as string);
    }
    return {};
  } finally {
    clearTimeout(timeout! as TTimeout);
  }
};

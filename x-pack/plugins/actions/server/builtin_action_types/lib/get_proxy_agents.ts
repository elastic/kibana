/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Agent } from 'http';
import HttpProxyAgent from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { Logger } from '../../../../../../src/core/server';
import { ProxySettings } from '../../types';

interface GetProxyAgentsResponse {
  httpAgent: Agent | undefined;
  httpsAgent: Agent | undefined;
}

export function getProxyAgents(
  proxySettings: ProxySettings | undefined | null,
  logger: Logger
): GetProxyAgentsResponse {
  const undefinedResponse = {
    httpAgent: undefined,
    httpsAgent: undefined,
  };

  if (!proxySettings) {
    return undefinedResponse;
  }

  logger.debug(`Creating proxy agents for proxy: ${proxySettings.proxyUrl}`);
  let proxyUrl: URL;
  try {
    proxyUrl = new URL(proxySettings.proxyUrl);
  } catch (err) {
    logger.warn(`invalid proxy URL "${proxySettings.proxyUrl}" ignored`);
    return undefinedResponse;
  }

  const httpAgent = new HttpProxyAgent(proxySettings.proxyUrl);
  const httpsAgent = (new HttpsProxyAgent({
    host: proxyUrl.hostname,
    port: Number(proxyUrl.port),
    protocol: proxyUrl.protocol,
    headers: proxySettings.proxyHeaders,
    // do not fail on invalid certs if value is false
    rejectUnauthorized: proxySettings.proxyRejectUnauthorizedCertificates,
  }) as unknown) as Agent;
  // vsCode wasn't convinced HttpsProxyAgent is an http.Agent, so we convinced it

  return { httpAgent, httpsAgent };
}

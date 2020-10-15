/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import HttpProxyAgent from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { Logger } from '../../../../../../src/core/server';
import { ProxySettings } from '../../types';

export function getProxyAgent(
  proxySettings: ProxySettings,
  logger: Logger
): HttpsProxyAgent | HttpProxyAgent {
  logger.debug(`Create proxy agent for ${proxySettings.proxyUrl}.`);

  if (/^https/i.test(proxySettings.proxyUrl)) {
    const proxyUrl = new URL(proxySettings.proxyUrl);
    return new HttpsProxyAgent({
      host: proxyUrl.hostname,
      port: Number(proxyUrl.port),
      protocol: proxyUrl.protocol,
      headers: proxySettings.proxyHeaders,
      // do not fail on invalid certs if value is false
      rejectUnauthorized: proxySettings.proxyRejectUnauthorizedCertificates,
    });
  } else {
    return new HttpProxyAgent(proxySettings.proxyUrl);
  }
}

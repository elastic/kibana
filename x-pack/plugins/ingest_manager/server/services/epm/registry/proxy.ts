/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import HttpProxyAgent from 'http-proxy-agent';
import HttpsProxyAgent, {
  HttpsProxyAgent as IHttpsProxyAgent,
  HttpsProxyAgentOptions,
} from 'https-proxy-agent';
import { appContextService } from '../../index';
export interface RegistryProxySettings {
  proxyUrl: string;
  proxyHeaders?: Record<string, string>;
  proxyRejectUnauthorizedCertificates?: boolean;
}

type ProxyAgent = IHttpsProxyAgent | HttpProxyAgent;
type GetProxyAgentParams = RegistryProxySettings & { targetUrl: string };

export function getRegistryProxyUrl(): string | undefined {
  const proxyUrl = appContextService.getConfig()?.registryProxyUrl;
  return proxyUrl;
}

export function getProxyAgent(options: GetProxyAgentParams): ProxyAgent {
  const isHttps = options.targetUrl.startsWith('https:');
  const agentOptions = isHttps && getProxyAgentOptions(options);
  const agent: ProxyAgent = isHttps
    ? // @ts-expect-error ts(7009) HttpsProxyAgent isn't a class so TS complains about using `new`
      new HttpsProxyAgent(agentOptions)
    : new HttpProxyAgent(options.proxyUrl);

  return agent;
}

export function getProxyAgentOptions(options: GetProxyAgentParams): HttpsProxyAgentOptions {
  const endpointParsed = new URL(options.targetUrl);
  const proxyParsed = new URL(options.proxyUrl);

  return {
    host: proxyParsed.hostname,
    port: Number(proxyParsed.port),
    protocol: proxyParsed.protocol,
    // The headers to send
    headers: options.proxyHeaders || {
      // the proxied URL's host is put in the header instead of the server's actual host
      Host: endpointParsed.host,
    },
    // do not fail on invalid certs if value is false
    rejectUnauthorized: options.proxyRejectUnauthorizedCertificates,
  };
}

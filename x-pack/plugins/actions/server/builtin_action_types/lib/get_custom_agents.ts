/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecureVersion } from 'tls';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';
import HttpProxyAgent from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { Logger } from '../../../../../../src/core/server';
import { ActionsConfigurationUtilities } from '../../actions_config';
import { ConnectorOptionsWithId } from '../../../../connectors_networking/server';

interface GetCustomAgentsResponse {
  httpAgent: HttpAgent | undefined;
  httpsAgent: HttpsAgent | undefined;
}

export async function getCustomAgents(
  configurationUtilities: ActionsConfigurationUtilities,
  logger: Logger,
  url: string
): Promise<GetCustomAgentsResponse> {
  const proxySettings = configurationUtilities.getProxySettings();
  const defaultAgents = {
    httpAgent: new HttpAgent(),
    httpsAgent: new HttpsAgent({
      rejectUnauthorized: configurationUtilities.isRejectUnauthorizedCertificatesEnabled(),
    }),
  };

  let connectorOptions: ConnectorOptionsWithId | undefined;
  try {
    connectorOptions = await configurationUtilities.connectorsNetworkingClient.findForUrl(url);
  } catch (err) {
    // connectorOptions will still be undefined at this point, which is what we want
    logger.warn(
      `error getting connector networking options for url: "${url}", using default options: ${err.message}`
    );
  }

  logger.debug(`found connector options: ${JSON.stringify(connectorOptions)}`);
  if (connectorOptions) {
    const httpsOptions = defaultAgents.httpsAgent.options;
    if (connectorOptions.timeout) httpsOptions.timeout = connectorOptions.timeout;

    if (connectorOptions.tls) {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { ca, ciphers, dh_param, ecdh_curve, min_dh_size } = connectorOptions.tls;
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { max_version, min_version, reject_unauthorized, sig_algs } = connectorOptions.tls;
      const maxVersion = getTlsSecureVersion(max_version, logger);
      const minVersion = getTlsSecureVersion(max_version, logger);

      if (ca != null) httpsOptions.ca = ca;
      if (ciphers != null) httpsOptions.ciphers = ciphers;
      if (dh_param != null) httpsOptions.dhparam = dh_param;
      if (ecdh_curve != null) httpsOptions.ecdhCurve = ecdh_curve;
      if (max_version != null) httpsOptions.maxVersion = maxVersion;
      if (min_version != null) httpsOptions.minVersion = minVersion;
      if (min_dh_size != null) httpsOptions.minDHSize = min_dh_size;
      if (sig_algs != null) httpsOptions.sigalgs = sig_algs;
      if (reject_unauthorized != null) httpsOptions.rejectUnauthorized = reject_unauthorized;

      logger.debug(`customized TLS options for ${url}: ${JSON.stringify(httpsOptions)}`);
    }
  }

  if (!proxySettings) {
    return defaultAgents;
  }

  logger.debug(`Creating proxy agents for proxy: ${proxySettings.proxyUrl}`);
  let proxyUrl: URL;
  try {
    proxyUrl = new URL(proxySettings.proxyUrl);
  } catch (err) {
    logger.warn(`invalid proxy URL "${proxySettings.proxyUrl}" ignored`);
    return defaultAgents;
  }

  const httpAgent = new HttpProxyAgent(proxySettings.proxyUrl);
  const httpsAgent = (new HttpsProxyAgent({
    host: proxyUrl.hostname,
    port: Number(proxyUrl.port),
    protocol: proxyUrl.protocol,
    headers: proxySettings.proxyHeaders,
    // do not fail on invalid certs if value is false
    rejectUnauthorized: proxySettings.proxyRejectUnauthorizedCertificates,
  }) as unknown) as HttpsAgent;
  // vsCode wasn't convinced HttpsProxyAgent is an https.Agent, so we convinced it

  return { httpAgent, httpsAgent };
}

function getTlsSecureVersion(version: string | null, logger: Logger): SecureVersion | undefined {
  if (version == null) return;

  switch (version) {
    case 'TLSv1.3':
    case 'TLSv1.2':
    case 'TLSv1.1':
    case 'TLSv1':
      return version;
  }

  logger.debug(`invalid TLS version specified for min/max, ignored: "${version}"`);
}

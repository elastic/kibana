/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { omit } from 'lodash';
import fetch from 'node-fetch';
import { format, parse, Url } from 'url';

async function discoverAuth(parsedTarget: Url, log: ToolingLog) {
  const possibleCredentials = [`admin:changeme`, `elastic:changeme`];
  for (const auth of possibleCredentials) {
    const url = format({
      ...parsedTarget,
      auth,
    });
    let status: number;
    try {
      log.debug(`Fetching ${url}`);
      const response = await fetch(url);
      status = response.status;
    } catch (err) {
      log.debug(`${url} resulted in ${err.message}`);
      status = 0;
    }

    if (status === 200) {
      return auth;
    }
  }

  throw new Error(`Failed to authenticate user for ${format(parsedTarget)}`);
}

async function getKibanaUrl({ kibana, log }: { kibana: string; log: ToolingLog }) {
  try {
    const isCI = process.env.CI?.toLowerCase() === 'true';

    const parsedKibanaUrl = parse(kibana);

    const kibanaUrlWithoutAuth = format(omit(parsedKibanaUrl, 'auth'));

    log.debug(`Checking Kibana URL ${kibanaUrlWithoutAuth} for a redirect`);

    const unredirectedResponse = await fetch(kibanaUrlWithoutAuth, {
      headers: {
        ...(parsedKibanaUrl.auth
          ? { Authorization: `Basic ${Buffer.from(parsedKibanaUrl.auth).toString('base64')}` }
          : {}),
      },
      method: 'HEAD',
      follow: 1,
      redirect: 'manual',
    });

    log.debug('Unredirected response', unredirectedResponse.headers.get('location'));

    const discoveredKibanaUrl =
      unredirectedResponse.headers
        .get('location')
        ?.replace('/spaces/enter', '')
        ?.replace('spaces/space_selector', '') || kibanaUrlWithoutAuth;

    log.debug(`Discovered Kibana URL at ${discoveredKibanaUrl}`);

    const parsedTarget = parse(kibana);

    const parsedDiscoveredUrl = parse(discoveredKibanaUrl);

    const discoveredKibanaUrlWithAuth = format({
      ...parsedDiscoveredUrl,
      auth: parsedTarget.auth,
    });

    const redirectedResponse = await fetch(discoveredKibanaUrlWithAuth, {
      method: 'HEAD',
    });

    if (redirectedResponse.status !== 200) {
      throw new Error(
        `Expected HTTP 200 from ${discoveredKibanaUrlWithAuth}, got ${redirectedResponse.status}`
      );
    }

    const discoveredKibanaUrlWithoutAuth = format({
      ...parsedDiscoveredUrl,
      auth: undefined,
    });

    log.info(
      `Discovered kibana running at: ${
        isCI ? discoveredKibanaUrlWithoutAuth : discoveredKibanaUrlWithAuth
      }`
    );

    return discoveredKibanaUrlWithAuth.replace(/\/$/, '');
  } catch (error) {
    throw new Error(`Could not connect to Kibana: ` + error.message);
  }
}

export async function getServiceUrls({
  log,
  elasticsearch,
  kibana,
}: {
  elasticsearch: string;
  kibana: string;
  log: ToolingLog;
}) {
  if (!elasticsearch) {
    // assume things are running locally
    kibana = kibana || 'http://127.0.0.1:5601';
    elasticsearch = 'http://127.0.0.1:9200';
  }

  if (!elasticsearch) {
    throw new Error('Could not determine an Elasticsearch target');
  }

  const parsedTarget = parse(elasticsearch);

  let auth = parsedTarget.auth;

  if (!parsedTarget.auth) {
    auth = await discoverAuth(parsedTarget, log);
  }

  const formattedEsUrl = format({
    ...parsedTarget,
    auth,
  });

  const suspectedKibanaUrl = kibana || elasticsearch.replace('.es', '.kb');

  const parsedKibanaUrl = parse(suspectedKibanaUrl);

  const kibanaUrlWithAuth = format({
    ...parsedKibanaUrl,
    auth: parsedKibanaUrl.auth || auth,
  });

  const validatedKibanaUrl = await getKibanaUrl({ kibana: kibanaUrlWithAuth, log });

  return {
    kibanaUrl: validatedKibanaUrl,
    esUrl: formattedEsUrl,
  };
}

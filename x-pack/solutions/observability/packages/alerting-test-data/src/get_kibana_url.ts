/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KIBANA_DEFAULT_URL } from './constants';

let kibanaUrl: string;

export async function getKibanaUrl() {
  if (kibanaUrl) {
    return kibanaUrl;
  }

  try {
    const unredirectedResponse = await fetch(KIBANA_DEFAULT_URL, {
      method: 'HEAD',
      redirect: 'manual',
    });

    const discoveredKibanaUrl = new URL(
      unredirectedResponse.headers
        .get('location')
        ?.replace('/spaces/enter', '')
        ?.replace('spaces/space_selector', '') || KIBANA_DEFAULT_URL,
      KIBANA_DEFAULT_URL
    );

    const redirectedResponse = await fetch(discoveredKibanaUrl.toString(), {
      method: 'HEAD',
    });

    if (redirectedResponse.status !== 200) {
      throw new Error(
        `Expected HTTP 200 from ${discoveredKibanaUrl}, got ${redirectedResponse.status}`
      );
    }

    // eslint-disable-next-line no-console
    console.log(`Discovered kibana running at: ${discoveredKibanaUrl}`);

    kibanaUrl = discoveredKibanaUrl.toString().replace(/\/$/, '');
    return kibanaUrl;
  } catch (error) {
    throw new Error(`Could not connect to Kibana: ` + error.message);
  }
}

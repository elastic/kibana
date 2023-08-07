/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';

export async function setupProfilingResources({
  kibanaUrlWithAuth,
}: {
  kibanaUrlWithAuth: string;
}) {
  // eslint-disable-next-line no-console
  console.log('Setting up Universal profiling resources...');
  await axios.post(
    `${kibanaUrlWithAuth}/internal/profiling/setup/es_resources`,
    {},
    { headers: { 'kbn-xsrf': true } }
  );
  // eslint-disable-next-line no-console
  console.log('[Done] Setting up Universal profiling resources.');
}

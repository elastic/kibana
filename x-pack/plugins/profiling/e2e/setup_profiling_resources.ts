/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { getRoutePaths } from '../common';

export async function setupProfilingResources({
  kibanaUrlWithAuth,
}: {
  kibanaUrlWithAuth: string;
}) {
  const paths = getRoutePaths();

  // eslint-disable-next-line no-console
  console.log('Setting up Universal profiling resources...');
  await axios.post(
    `${kibanaUrlWithAuth}/${paths.HasSetupESResources}`,
    {},
    { headers: { 'kbn-xsrf': true } }
  );
  // eslint-disable-next-line no-console
  console.log('[Done] Setting up Universal profiling resources.');
}

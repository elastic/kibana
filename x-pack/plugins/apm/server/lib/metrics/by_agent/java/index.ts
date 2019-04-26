/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Setup } from '../../../helpers/setup_request';
import { fetch } from './fetcher';
import { transform } from './transformer';

export type JavaMetricsChartAPIResponse = ReturnType<typeof transform>;

export async function getJavaMetricsChartData(
  setup: Setup,
  serviceName: string
) {
  const result = await fetch(setup, serviceName);
  return transform(result);
}

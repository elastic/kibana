/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BASE_RAC_ALERTS_API_PATH } from '@kbn/rule-registry-plugin/common';
import type { HttpSetup } from '@kbn/core/public';

export async function fetchAlertIndexNames({
  http,
  features,
}: {
  http: HttpSetup;
  features: string;
}): Promise<string[]> {
  const { index_name: indexNamesStr = [] } = await http.get<{ index_name: string[] }>(
    `${BASE_RAC_ALERTS_API_PATH}/index`,
    {
      query: { features },
    }
  );
  return indexNamesStr;
}

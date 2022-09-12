/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from '@kbn/core/public';
import { BASE_ALERTING_API_PATH, INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';

export async function enableRule({ id, http }: { id: string; http: HttpSetup }): Promise<void> {
  await http.post(`${BASE_ALERTING_API_PATH}/rule/${encodeURIComponent(id)}/_enable`);
}

export interface BulkEnableRulesProps {
  ids?: string[];
  filter?: string;
}

export async function bulkEnableRules({
  ids,
  filter,
  http,
}: BulkEnableRulesProps & { http: HttpSetup }): Promise<void> {
  await http.post(`${INTERNAL_BASE_ALERTING_API_PATH}/rules/_bulk_edit`, {
    body: JSON.stringify({
      ids,
      filter,
      operations: [
        {
          operation: 'set',
          field: 'enable',
          value: true,
        },
      ],
    }),
  });
}

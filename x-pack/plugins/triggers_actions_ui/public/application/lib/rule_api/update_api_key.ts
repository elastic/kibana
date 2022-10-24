/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from '@kbn/core/public';
import { KueryNode } from '@kbn/es-query';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';
import { BulkEditResponse } from '../../../types';

export async function updateAPIKey({ id, http }: { id: string; http: HttpSetup }): Promise<string> {
  return http.post<string>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rule/${encodeURIComponent(id)}/_update_api_key`
  );
}

export interface BulkUpdateAPIKeyProps {
  ids?: string[];
  filter?: KueryNode | null | undefined;
}

export function bulkUpdateAPIKey({
  ids,
  filter,
  http,
}: BulkUpdateAPIKeyProps & { http: HttpSetup }): Promise<BulkEditResponse> {
  let body: string;
  try {
    body = JSON.stringify({
      ids: ids?.length ? ids : undefined,
      ...(filter ? { filter: JSON.stringify(filter) } : {}),
      operations: [
        {
          operation: 'set',
          field: 'apiKey',
        },
      ],
    });
  } catch (e) {
    throw new Error(`Unable to parse bulk update API key params: ${e}`);
  }
  return http.post(`${INTERNAL_BASE_ALERTING_API_PATH}/rules/_bulk_edit`, { body });
}

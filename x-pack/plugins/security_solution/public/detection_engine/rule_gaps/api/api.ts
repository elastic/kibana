/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  INTERNAL_ALERTING_BACKFILL_FIND_API_PATH,
  INTERNAL_ALERTING_BACKFILL_API_PATH,
} from '@kbn/alerting-plugin/common';
import type { FindBackfillResponseBody } from '@kbn/alerting-plugin/common/routes/backfill/apis/find';
import { KibanaServices } from '../../../common/lib/kibana';

/**
 * Find backfills for the given rule IDs
 * @param ruleIds string[]
 * @param signal? AbortSignal
 * @returns
 */
export const findBackfillsForRules = async ({
  ruleIds,
  page,
  perPage,
  signal,
  sortField = 'createdAt',
  sortOrder = 'desc',
}: {
  ruleIds: string[];
  page: number;
  perPage: number;
  signal?: AbortSignal;
  sortField?: string;
  sortOrder?: string;
}): Promise<FindBackfillResponseBody> =>
  KibanaServices.get().http.fetch<FindBackfillResponseBody>(
    INTERNAL_ALERTING_BACKFILL_FIND_API_PATH,
    {
      method: 'POST',
      query: {
        rule_ids: ruleIds.join(','),
        page,
        per_page: perPage,
        sort_field: sortField,
        sort_order: sortOrder,
      },
      signal,
    }
  );

/**
 * Delete backfill by ID
 * @param backfillId
 * @returns
 */
export const deleteBackfill = async ({ backfillId }: { backfillId: string }) => {
  return KibanaServices.get().http.fetch<FindBackfillResponseBody>(
    `${INTERNAL_ALERTING_BACKFILL_API_PATH}/${backfillId}`,
    {
      method: 'DELETE',
    }
  );
};

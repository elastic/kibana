/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ErrorDistributionResponse } from '@kbn/apm-api-shared';
import type { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { isPending } from '../../../hooks/use_fetcher';

export type ApmErrorsPresence = 'pending' | 'present' | 'absent';

/**
 * Derives "does this service have any APM error documents in range" from the error
 * distribution response, which the Errors page already fetches.
 *
 * Why this and not the errors table's own main_statistics:
 * `use_error_group_list_data.tsx` sends `searchQuery` to the server, so that array
 * empties whenever the user types a non-matching term in the table.  Using it would
 * collapse the whole APM section mid-search. The distribution is not filtered by the
 * table's search query — only by serviceName / environment / kuery / range — making it
 * the only search-stable emptiness signal available on this page.
 *
 * Known divergence to be aware of: `get_buckets.ts` excludes `error.type: "crash"`
 * documents while `main_statistics` does not. A service whose ONLY errors are crashes
 * reads as 'absent' here, even though the table would have rows. Crashes belong to the
 * mobile errors-and-crashes tab, so the exposure on this page is narrow.
 */
export function getApmErrorsPresence({
  errorDistributionData,
  errorDistributionStatus,
}: {
  errorDistributionData?: ErrorDistributionResponse;
  errorDistributionStatus: FETCH_STATUS;
}): ApmErrorsPresence {
  if (isPending(errorDistributionStatus) || !errorDistributionData) return 'pending';

  // `getBuckets` uses `min_doc_count: 0` + `extended_bounds`, so bucket arrays are
  // never empty — you must sum the `y` values rather than checking `length`.
  const currentTotal = errorDistributionData.currentPeriod.reduce(
    (sum, { y }) => sum + (y ?? 0),
    0
  );
  const previousTotal = errorDistributionData.previousPeriod.reduce(
    (sum, { y }) => sum + (y ?? 0),
    0
  );

  return currentTotal + previousTotal > 0 ? 'present' : 'absent';
}

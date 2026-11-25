/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProfilingScopeCandidate } from '../../../common/profiling/hosts_scope';
import { mergeKueries } from '../../../common/utils/kuery_utils';

/**
 * Runs `fetch` for each candidate scope, most specific first, and returns the first result that
 * contains samples. The least specific scope is returned as-is when nothing matches, so the
 * response still tells the UI which keys were tried.
 *
 * Returns undefined when no candidates are provided.
 */
export async function fetchFirstScopeWithSamples<T>({
  candidates,
  kuery,
  fetch,
  hasSamples,
}: {
  candidates: ProfilingScopeCandidate[];
  kuery: string;
  fetch: (scopedKuery: string) => Promise<T>;
  hasSamples: (result: T) => boolean;
}): Promise<{ candidate: ProfilingScopeCandidate; result: T } | undefined> {
  let last: { candidate: ProfilingScopeCandidate; result: T } | undefined;

  for (const candidate of candidates) {
    const result = await fetch(mergeKueries([candidate.kuery, kuery]));
    last = { candidate, result };
    if (hasSamples(result)) {
      return last;
    }
  }

  return last;
}

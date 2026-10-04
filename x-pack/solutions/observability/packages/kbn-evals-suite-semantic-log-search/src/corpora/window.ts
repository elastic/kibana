/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import type { CorpusProfile } from './types';

/**
 * Resolves a profile's relative window to absolute ISO timestamps against a single point in time.
 *
 * Profiles are authored as `now-2h` / `now`, which is re-evaluated on every request, so the two
 * arms of one run measure different windows and seeded documents age out between them. Measured
 * over three consecutive runs against one unchanged 2,632-document seed, the audited in-window
 * count fell from 2,593 to 2,447 to 2,333. Resolving once and handing the result to both arms is
 * what makes an arm-versus-arm comparison exact.
 *
 * Both bounds resolve against the same `now`, so the result is a fixed span rather than two
 * independently evaluated expressions. Runs still differ from one another, by design: the window
 * follows the freshly seeded data instead of pinning to a date that would eventually age out of
 * the hot tier.
 */
export const resolveCorpusWindow = (
  corpus: CorpusProfile,
  now: Date = new Date()
): CorpusProfile => {
  const { start, end } = corpus.timeRange;

  const resolvedStart = dateMath.parse(start, { forceNow: now });
  // `roundUp` is the Kibana convention for an end bound, so a profile written as `now/d` means the
  // end of that day rather than its start. A plain `now` is unaffected.
  const resolvedEnd = dateMath.parse(end, { forceNow: now, roundUp: true });

  if (!resolvedStart?.isValid() || !resolvedEnd?.isValid()) {
    throw new Error(
      `Corpus "${corpus.id}" has an unparseable time range: start="${start}", end="${end}"`
    );
  }

  if (!resolvedStart.isBefore(resolvedEnd)) {
    throw new Error(
      `Corpus "${corpus.id}" resolved to an empty or inverted window: ` +
        `${resolvedStart.toISOString()} is not before ${resolvedEnd.toISOString()}`
    );
  }

  return {
    ...corpus,
    timeRange: { start: resolvedStart.toISOString(), end: resolvedEnd.toISOString() },
  };
};

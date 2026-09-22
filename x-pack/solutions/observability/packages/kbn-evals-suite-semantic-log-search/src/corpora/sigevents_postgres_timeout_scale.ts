/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CorpusProfile } from './types';
import { MESSAGE_CLASSES, QUERIES } from './sigevents_postgres_timeout';

/**
 * Scale variant of `sigevents_postgres_timeout`: the same labels and queries at a higher
 * `baseRate`, so the corpus crosses 50 000 documents.
 *
 * That threshold is where `collectCandidates` stops running a single unsampled CATEGORIZE pass
 * and starts sampling over a head pass and a rare pass, which makes this the only corpus that
 * measures the sampled path end to end. The rare pass is what the measurement is for: selecting
 * candidates by frequency alone drops low-count patterns, and the pattern an incident question is
 * reaching for is usually a rare one. The unit tests cover that arithmetic; only a corpus this
 * size exercises the decision against real data.
 * https://github.com/elastic/kibana/blob/58b8b4792828/x-pack/platform/packages/shared/ml/random_sampler_utils/src/get_sample_probability.ts#L8
 *
 * Because sampling engages here and ES|QL `SAMPLE` takes no seed, two runs of this corpus draw
 * different documents and the counts are extrapolated estimates. Expect run-to-run movement in
 * the document-weighted metrics that is not a change in ranking quality.
 *
 * `baseRate=10` over a 2-hour window is calibrated to cross the threshold, not guaranteed to:
 * confirm that `logRunManifest` reports more than 50 000 documents before reading anything into a
 * result from this corpus, and raise `baseRate` or widen the window if it does not.
 *
 * This profile and the small one write the same labels to the same data stream, so an audit
 * cannot tell them apart and switching between them needs a re-seed. The `--clean` in
 * `setupCommand` does that; running both in one session without it measures whichever was
 * seeded last.
 */
export const sigeventsPostgresTimeoutScale: CorpusProfile = {
  id: 'sigevents_postgres_timeout_scale',
  description:
    'Scale variant of sigevents_postgres_timeout: same labels, higher volume (> 50k docs) ' +
    'to exercise the two-pass CATEGORIZE candidate collection path.',

  target: 'logs-synth-default',
  timeRange: { start: 'now-2h', end: 'now' },

  setupCommand: `node scripts/synthtrace sigevents \\
  --target=http://elastic:changeme@localhost:9220 \\
  --kibana=http://elastic:changeme@localhost:5620 \\
  --scenarioOpts="scenario=postgres_timeout,seed=42,baseRate=10" \\
  --from=now-2h --to=now --clean`,

  messageClasses: MESSAGE_CLASSES,
  queries: QUERIES,

  k: 10,
  relevanceThreshold: 2,
  maxPatterns: 20,
};

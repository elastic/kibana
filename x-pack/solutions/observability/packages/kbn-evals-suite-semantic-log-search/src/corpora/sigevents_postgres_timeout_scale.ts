/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CorpusProfile } from './types';
import { MESSAGE_CLASSES, QUERIES } from './sigevents_postgres_timeout';

/**
 * Scale variant of `sigevents_postgres_timeout`.
 *
 * Identical ground truth labels and queries, but generated with a higher
 * `baseRate` and wider time window so the corpus crosses the 50,000-document
 * threshold where `collectCandidates` switches from a single unsampled
 * CATEGORIZE pass to the two-pass head/rare path:
 *
 * ```
 * // x-pack/platform/packages/shared/ml/random_sampler_utils/src/get_sample_probability.ts
 * const SAMPLE_PROBABILITY_MIN_DOC_COUNT = 50_000;
 * // getSampleProbability returns 1 (no sampling) at or below this threshold.
 * ```
 *
 * That two-pass path contains all the logic guarding the failure measured during
 * PoC work: capping candidates by frequency deleted rare incident-case patterns
 * and took relevance from 2/10 → 0/10. Unit tests cover the pure helpers; this
 * corpus provides end-to-end measurement.
 *
 * ## Calibration note
 *
 * `baseRate=10` with `--from=now-2h` was chosen to cross 50,000 documents
 * on the `sigevents` scenario with `scenario=postgres_timeout,seed=42`.
 * Verify that `logRunManifest`'s `documents:` line reports **> 50,000**
 * before drawing conclusions from this corpus's results. If the number
 * has changed (different ES ingestion rate, scenario changes), adjust
 * `baseRate` or widen `--from` until the threshold is crossed.
 *
 * ## Corpus switching
 *
 * Both this profile and `sigevents_postgres_timeout` (the small corpus) share
 * the `logs-synth-default` data stream and use the same ground-truth labels.
 * `seedCorpusIfNeeded` cannot distinguish them by labels alone. If you run the
 * scale corpus immediately after the small one (or vice versa), you must either:
 * - Use `ES_URL`/`KIBANA_URL` env vars and let the seed command's `--clean` flag
 *   purge and re-seed automatically (the default behaviour), or
 * - Run the seed command manually before starting the evals.
 *
 * The two corpora are not intended to run in the same session without a re-seed.
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deriveQueryType, getStatsQueryHints } from '@kbn/streams-schema';
import { QUERY_TYPE_STATS } from '@kbn/significant-events-schema';
import type { KIQueryGenerationEvaluator } from '../types';
import { getQueriesFromOutput } from '../types';

interface StatsQueryDetail {
  esql: string;
  title: string;
  checksTotal: number;
  checksPassed: number;
  hints: string[];
}

/**
 * Validates the structural quality of STATS-type queries using the same
 * guardrails enforced by `getStatsQueryHints` (metric-series contract).
 *
 * For each STATS query, checks:
 * - Has temporal bucketing (`BUCKET(@timestamp, …)` / `TBUCKET`)
 * - Bucket column is named `bucket` with a 1-minute interval
 * - Emits a final column named exactly `metric_value`
 * - No post-STATS `WHERE` that drops buckets (thresholds / sample floors)
 * - Denominator is filtered (`IS NOT NULL`, `IN (...)`, or equality)
 * - No forbidden commands after STATS (`SORT`, `LIMIT`)
 * - No non-temporal GROUP BY dimensions (v0: time bucket only)
 *
 * Returns `null` if no STATS queries are present.
 */
export const statsStructureValidationEvaluator: KIQueryGenerationEvaluator = {
  name: 'stats_structure_validation',
  kind: 'CODE' as const,
  direction: 'maximize',
  evaluate: async ({ output }) => {
    const queries = getQueriesFromOutput(output);
    const statsQueries = queries.filter((q) => deriveQueryType(q.esql) === QUERY_TYPE_STATS);

    if (statsQueries.length === 0) {
      return { score: null, explanation: 'No STATS queries to validate' };
    }

    const perQueryDetails: StatsQueryDetail[] = [];

    for (const query of statsQueries) {
      const hints = getStatsQueryHints(query.esql);

      const issues = [
        hints.some((h) => h.includes('no temporal bucketing')),
        hints.some((h) => h.includes('named exactly `bucket`')),
        hints.some((h) => h.includes('1-minute')),
        hints.some((h) => h.includes('metric_value')),
        hints.some((h) => h.includes('Avoid WHERE after STATS')),
        hints.some((h) => h.includes('unfiltered COUNT')),
        hints.some((h) => h.includes('should not be used')),
        hints.some((h) => h.includes('GROUP BY')),
      ];
      const checksTotal = issues.length;
      const checksPassed = issues.filter((issue) => !issue).length;

      perQueryDetails.push({
        esql: query.esql,
        title: query.title,
        checksTotal,
        checksPassed,
        hints,
      });
    }

    const score =
      perQueryDetails.reduce((sum, d) => sum + d.checksPassed / d.checksTotal, 0) /
      perQueryDetails.length;

    const issueQueries = perQueryDetails.filter((d) => d.checksPassed < d.checksTotal);
    const issueLines = issueQueries.map(
      (d) => `"${d.title}" (${d.checksPassed}/${d.checksTotal}): ${d.hints.join('; ')}`
    );

    return {
      score,
      explanation:
        issueLines.length > 0
          ? `STATS structure issues: ${issueLines.join(' | ')}`
          : `All ${statsQueries.length} STATS queries pass structural validation`,
      metadata: {
        totalStatsQueries: statsQueries.length,
        perQuery: perQueryDetails,
      },
    };
  },
};

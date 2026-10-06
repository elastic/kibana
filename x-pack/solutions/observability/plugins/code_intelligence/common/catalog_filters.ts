/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Most repositories one catalog request may filter on. */
export const MAX_CATALOG_REPOSITORY_FILTERS = 100;

export const CATALOG_SIGNAL_TYPES = ['log', 'trace', 'metric'] as const;
export type CatalogSignalType = (typeof CATALOG_SIGNAL_TYPES)[number];

export const CATALOG_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export type CatalogSeverity = (typeof CATALOG_SEVERITIES)[number];

/** `default` orders by relevance when searching and by most recently updated otherwise. */
export const CATALOG_SORTS = ['default', 'severity_desc', 'severity_asc'] as const;
export type CatalogSort = (typeof CATALOG_SORTS)[number];

/** Most repositories the catalog summary reports. */
export const MAX_CATALOG_SUMMARY_REPOSITORIES = 1000;

/** Catalog entry counts for 1 repository; entries without a score count only toward `total`. */
export interface CatalogRepositorySummary {
  readonly repository: string;
  readonly total: number;
  readonly severities: Readonly<Record<CatalogSeverity, number>>;
}

/**
 * Inclusive `severity_score` ranges for each level. Log levels score 20-30 for debug and info,
 * 50 for warn, 70 for error, and 80 for fatal, so each level lands in its own bucket.
 */
export const CATALOG_SEVERITY_RANGES: Readonly<
  Record<CatalogSeverity, { readonly gte: number; readonly lte: number }>
> = {
  low: { gte: 0, lte: 39 },
  medium: { gte: 40, lte: 59 },
  high: { gte: 60, lte: 79 },
  critical: { gte: 80, lte: 100 },
};

export const severityForScore = (score: number | undefined): CatalogSeverity | undefined =>
  score === undefined
    ? undefined
    : CATALOG_SEVERITIES.find((severity) => {
        const { gte, lte } = CATALOG_SEVERITY_RANGES[severity];
        return score >= gte && score <= lte;
      });

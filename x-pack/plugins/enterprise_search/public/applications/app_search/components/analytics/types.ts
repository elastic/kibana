/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface Query {
  doc_count: number;
  key: string;
  clicks?: { doc_count: number };
  searches?: { doc_count: number };
  tags?: string[];
}

interface QueryClick extends Query {
  document?: {
    id: string;
    engine: string;
    tags?: string[];
  };
}

interface RecentQuery {
  document_ids: string[];
  query_string: string;
  tags: string[];
  timestamp: string;
}

/**
 * API response data
 */

interface BaseData {
  analyticsUnavailable: boolean;
  allTags: string[];
  // NOTE: The API sends us back even more data than this (e.g.,
  // startDate, endDate, currentTag, logRetentionSettings, query),
  // but we currently don't need that data in our front-end code,
  // so I'm opting not to list them in our types
}

export interface AnalyticsData extends BaseData {
  recentQueries: RecentQuery[];
  topQueries: Query[];
  topQueriesWithClicks: Query[];
  topQueriesNoClicks: Query[];
  topQueriesNoResults: Query[];
  totalClicks: number;
  totalQueries: number;
  totalQueriesNoResults: number;
  clicksPerDay: number[];
  queriesPerDay: number[];
  queriesNoResultsPerDay: number[];
}

export interface QueryDetails extends BaseData {
  totalQueriesForQuery: number;
  queriesPerDayForQuery: number[];
  topClicksForQuery: QueryClick[];
}

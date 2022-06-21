/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface Query {
  key: string;
  tags?: string[];
  searches?: { doc_count: number };
  clicks?: { doc_count: number };
}

export interface QueryClick extends Query {
  document?: {
    id: string;
  };
}

export interface RecentQuery {
  query_string: string;
  timestamp: string;
  tags: string[];
  document_ids: string[];
}

/**
 * API response data
 */

interface BaseData {
  allTags: string[];
  startDate: string;
  // NOTE: The API sends us back even more data than this (e.g.,
  // analyticsUnavailable, endDate, currentTag, logRetentionSettings, query),
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

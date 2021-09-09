/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type StaticPage =
  | 'base'
  | 'overview'
  | 'live_queries'
  | 'live_query_new'
  | 'scheduled_query_groups'
  | 'scheduled_query_group_add'
  | 'saved_queries'
  | 'saved_query_new';

export type DynamicPage =
  | 'live_query_details'
  | 'scheduled_query_group_details'
  | 'scheduled_query_group_edit'
  | 'saved_query_edit';

export type Page = StaticPage | DynamicPage;

export interface DynamicPagePathValues {
  [key: string]: string;
}

// If routing paths are changed here, please also check to see if
// `pagePathGetters()`, below, needs any modifications
export const PAGE_ROUTING_PATHS = {
  overview: '/',
  live_queries: '/live_queries',
  live_query_new: '/live_queries/new',
  live_query_details: '/live_queries/:liveQueryId',
  scheduled_query_groups: '/scheduled_query_groups',
  scheduled_query_group_add: '/scheduled_query_groups/add',
  scheduled_query_group_details: '/scheduled_query_groups/:scheduledQueryGroupId',
  scheduled_query_group_edit: '/scheduled_query_groups/:scheduledQueryGroupId/edit',
};

export const pagePathGetters: {
  [key in StaticPage]: () => string;
} &
  {
    [key in DynamicPage]: (values: DynamicPagePathValues) => string;
  } = {
  base: () => '/',
  overview: () => '/',
  live_queries: () => '/live_queries',
  live_query_new: () => '/live_queries/new',
  live_query_details: ({ liveQueryId }) => `/live_queries/${liveQueryId}`,
  saved_queries: () => '/saved_queries',
  saved_query_new: () => '/saved_queries/new',
  saved_query_edit: ({ savedQueryId }) => `/saved_queries/${savedQueryId}`,
  scheduled_query_groups: () => '/scheduled_query_groups',
  scheduled_query_group_add: () => '/scheduled_query_groups/add',
  scheduled_query_group_details: ({ scheduledQueryGroupId }) =>
    `/scheduled_query_groups/${scheduledQueryGroupId}`,
  scheduled_query_group_edit: ({ scheduledQueryGroupId }) =>
    `/scheduled_query_groups/${scheduledQueryGroupId}/edit`,
};

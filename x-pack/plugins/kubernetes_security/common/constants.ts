/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const KUBERNETES_PATH = '/kubernetes' as const;

export const AGGREGATE_ROUTE = '/internal/kubernetes_security/aggregate';
export const COUNT_ROUTE = '/internal/kubernetes_security/count';
export const AGGREGATE_PAGE_SIZE = 10;

// so, bucket sort can only page through what we request at the top level agg, which means there is a ceiling to how many aggs we can page through.
// we should also test this approach at scale.
export const AGGREGATE_MAX_BUCKETS = 2000;

// react-query caching keys
export const QUERY_KEY_PERCENT_WIDGET = 'kubernetesSecurityPercentWidget';
export const QUERY_KEY_COUNT_WIDGET = 'kubernetesSecurityCountWidget';

export const DEFAULT_QUERY = '{"bool":{"must":[],"filter":[],"should":[],"must_not":[]}}';

// ECS fields
export const ENTRY_LEADER_INTERACTIVE = 'process.entry_leader.interactive';
export const ENTRY_LEADER_USER_ID = 'process.entry_leader.user.id';
export const ENTRY_LEADER_ENTITY_ID = 'process.entry_leader.entity_id';

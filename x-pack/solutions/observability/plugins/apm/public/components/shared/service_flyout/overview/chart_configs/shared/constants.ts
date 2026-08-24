/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const TIME_BUCKET_FIELD = 'timestamp';
export const TARGET_BUCKET_COUNT = 100;

/**
 * `TBUCKET` derives the time range from the Kibana time filter. An explicit span keeps the interval
 * identical to the `fixed_interval` the APM chart APIs use, so the same data lands in the same
 * bucket; without it Elasticsearch picks its own span and the two charts dilute spikes differently.
 */
export const timeBucketBy = (bucketSizeInSeconds?: number) =>
  `${TIME_BUCKET_FIELD} = TBUCKET(${
    bucketSizeInSeconds ? `${bucketSizeInSeconds} seconds` : TARGET_BUCKET_COUNT
  })`;

export const TIME_BUCKET_BY = timeBucketBy();
export const ESQL_NULLIFY_UNMAPPED_FIELDS = 'SET unmapped_fields="nullify";';

/**
 * CPS (cross-project search): scope the query to the given project routing. Without it the
 * query runs with the server default (`_alias:_origin`), which misses linked-project data.
 * An explicit `SET project_routing` in the query text takes precedence over picker values.
 */
export const esqlSetProjectRouting = (projectRouting: string) =>
  `SET project_routing="${projectRouting}";`;

// When no limit is specified in the container, docker allows the app as much memory / swap memory
// as it wants. This number represents the max possible value for the limit field. Stored as a
// string to avoid JS floating-point precision loss. The equivalent Painless constant lives at:
// https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/apm/server/routes/metrics/by_agent/shared/memory/index.ts#L87
export const CGROUP_LIMIT_MAX_VALUE = '9223372036854771712';

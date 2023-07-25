/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * @internal
 * Used for querying across all data stored by Reporting.
 * The wildcard avoids a 404 error in case no stored data exists.
 */
export const REPORTING_DATA_STREAM = '.kibana-reporting';
/**
 * @internal
 * Used for querying across all data stored by Reporting.
 * The wildcard avoids a 404 error in case no stored data exists.
 * NOTE: `.reporting-*` is the system index pattern used before 8.10 and has equivalent mappings.
 */
export const REPORTING_DATA_STREAM_WILDCARD = `.reporting-*,.kibana-reporting*`;

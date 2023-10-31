/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// geo_line aggregation without time series buckets uses lots of resources
// limit resource consumption by limiting number of tracks to smaller amount
export const MAX_TERMS_TRACKS = 250;

// Constant is used to identify time series id field in UIs, tooltips, and styling.
// Constant is not passed to Elasticsearch APIs and is not related to '_tsid' document metadata field.
// Constant value of '_tsid' is arbitrary.
export const TIME_SERIES_ID_FIELD_NAME = '_tsid';

export const DEFAULT_LINE_SIMPLIFICATION_SIZE = 500;

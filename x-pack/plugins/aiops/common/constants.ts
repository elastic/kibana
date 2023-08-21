/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The p-value threshold to be used for statistically significant items.
 */
export const LOG_RATE_ANALYSIS_P_VALUE_THRESHOLD = 0.02;

/**
 * For the technical preview of Log Rate Analysis we use a hard coded seed.
 * In future versions we might use a user specific seed or let the user customise it.
 */
export const RANDOM_SAMPLER_SEED = 3867412;

export const CASES_ATTACHMENT_CHANGE_POINT_CHART = 'aiopsChangePointChart';

export const EMBEDDABLE_CHANGE_POINT_CHART_TYPE = 'aiopsChangePointChart' as const;

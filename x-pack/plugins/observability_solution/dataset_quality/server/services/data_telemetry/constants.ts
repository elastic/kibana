/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CLUSTER_SETTLEMENT_DELAY = 10 * 60 * 60 * 1000; // 10 hours
export const TELEMETRY_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

export const BREATH_DELAY_SHORT = 0;
export const BREATH_DELAY_MEDIUM = 0;
export const BREATH_DELAY_LONG = 0;

export const NON_LOG_SIGNALS = ['metrics', 'traces', 'internal', 'synthetics'];
export const EXCLUDE_ELASTIC_LOGS = ['logs-synth', 'logs-apm', 'logs-elastic', 'logs-endpoint'];

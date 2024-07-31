/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const STARTUP_DELAY = 10 * 60 * 60 * 1000; // 10 hours
export const TELEMETRY_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

export const BREATHE_DELAY_SHORT = 10 * 1000; // 10 seconds
export const BREATHE_DELAY_MEDIUM = 60 * 1000; // 1 minute
export const BREATHE_DELAY_LONG = 5 * 60 * 1000; // 5 minutes

export const MAX_STREAMS_TO_REPORT = 1000;

export const NON_LOG_SIGNALS = ['metrics', 'traces', 'internal', 'synthetics'];
export const EXCLUDE_ELASTIC_LOGS = ['logs-synth', 'logs-apm', 'logs-elastic', 'logs-endpoint'];

export const TELEMETRY_CHANNEL = 'logs-data-telemetry';

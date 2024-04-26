/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Index name where the SentinelOne activity log is written to by the SentinelOne integration
 */
export const SENTINEL_ONE_ACTIVITY_INDEX = 'logs-sentinel_one.activity-default';

/**
 * The passcode to be used when initiating actions in SentinelOne that require a passcode to be
 * set for the resulting zip file
 */
export const SENTINEL_ONE_ZIP_PASSCODE = 'Elastic@123';

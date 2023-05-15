/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @kbn/eslint/no_export_all */

export const PLUGIN_ID = 'observabilityLogs';
export const PLUGIN_NAME = 'observabilityLogs';

/**
 * Exporting versioned APIs types
 */
export type { FindIntegrationsRequestQuery, FindIntegrationsResponse } from './latest';
export * from './latest';
export * as dataStreamsV1 from './data_streams/v1';

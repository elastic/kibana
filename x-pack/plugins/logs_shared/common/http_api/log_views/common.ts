/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const LOG_VIEW_URL_PREFIX = '/api/infra/log_views';
export const LOG_VIEW_URL = `${LOG_VIEW_URL_PREFIX}/{logViewId}`;
export const getLogViewUrl = (logViewId: string) => `${LOG_VIEW_URL_PREFIX}/${logViewId}`;

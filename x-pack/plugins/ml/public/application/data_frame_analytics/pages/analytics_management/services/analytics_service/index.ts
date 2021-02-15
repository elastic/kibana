/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { getAnalyticsFactory } from './get_analytics';
export { deleteAnalytics, deleteAnalyticsAndDestIndex, canDeleteIndex } from './delete_analytics';
export { startAnalytics } from './start_analytics';
export { stopAnalytics } from './stop_analytics';

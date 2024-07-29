/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const GET_RECOMMENDATIONS_URL = '/internal/recommendations';
export const APPLY_RECOMMENDATIONS_URL = '/internal/recommendations/{recommendationId}';
export const SIMULATE_PIPELINE_URL = '/internal/recommendations/simulate_pipeline';

export const getApplyRecommendationUrl = (recommendationId: string) =>
  APPLY_RECOMMENDATIONS_URL.replace('{recommendationId}', recommendationId);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const PLUGIN_ID = 'pipeline_builder';
export const PIPELINE_BUILDER_EMBEDDABLE_TYPE = 'pipeline_builder';
export const NOT_INTERNATIONALIZED_PRODUCT_NAME = 'Pipeline Visualizations';
export const BASE_APP_URL = '/app/pipeline_builder';

export function getBasePath() {
  return BASE_APP_URL;
}

export function getEditPath(id: string) {
  return `${BASE_APP_URL}/edit/${encodeURIComponent(id)}`;
}

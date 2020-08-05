/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const PLUGIN_ID = 'lens';
export const LENS_EMBEDDABLE_TYPE = 'lens';
export const NOT_INTERNATIONALIZED_PRODUCT_NAME = 'Lens Visualizations';
export const BASE_API_URL = '/api/lens';

export function getBasePath() {
  return `#/`;
}

export function getEditPath(id: string) {
  return `#/edit/${encodeURIComponent(id)}`;
}

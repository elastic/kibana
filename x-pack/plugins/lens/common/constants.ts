/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const PLUGIN_ID = 'lens';
export const LENS_EMBEDDABLE_TYPE = 'lens';
export const DOC_TYPE = 'lens';
export const NOT_INTERNATIONALIZED_PRODUCT_NAME = 'Lens Visualizations';
export const BASE_API_URL = '/api/lens';
export const LENS_EDIT_BY_VALUE = 'edit_by_value';

export function getBasePath() {
  return `#/`;
}

export function getEditPath(id: string | undefined) {
  return id ? `#/edit/${encodeURIComponent(id)}` : `#/${LENS_EDIT_BY_VALUE}`;
}

export function getFullPath(id?: string) {
  return `/app/${PLUGIN_ID}${id ? getEditPath(id) : getBasePath()}`;
}

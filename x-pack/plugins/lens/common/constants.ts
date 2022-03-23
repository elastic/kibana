/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rison from 'rison-node';
import type { TimeRange } from '../../../../src/plugins/data/common/query';

export const PLUGIN_ID = 'lens';
export const APP_ID = 'lens';
export const LENS_EMBEDDABLE_TYPE = 'lens';
export const DOC_TYPE = 'lens';
export const NOT_INTERNATIONALIZED_PRODUCT_NAME = 'Lens Visualizations';
export const BASE_API_URL = '/api/lens';
export const LENS_EDIT_BY_VALUE = 'edit_by_value';

export const PieChartTypes = {
  PIE: 'pie',
  DONUT: 'donut',
  TREEMAP: 'treemap',
  MOSAIC: 'mosaic',
  WAFFLE: 'waffle',
} as const;

export const CategoryDisplay = {
  DEFAULT: 'default',
  INSIDE: 'inside',
  HIDE: 'hide',
} as const;

export const NumberDisplay = {
  HIDDEN: 'hidden',
  PERCENT: 'percent',
  VALUE: 'value',
} as const;

export const LegendDisplay = {
  DEFAULT: 'default',
  SHOW: 'show',
  HIDE: 'hide',
} as const;

export const layerTypes = {
  DATA: 'data',
  REFERENCELINE: 'referenceLine',
} as const;

// might collide with user-supplied field names, try to make as unique as possible
export const DOCUMENT_FIELD_NAME = '___records___';

export function getBasePath() {
  return `#/`;
}

const GLOBAL_RISON_STATE_PARAM = '_g';

export function getEditPath(id: string | undefined, timeRange?: TimeRange) {
  let timeParam = '';

  if (timeRange) {
    timeParam = `?${GLOBAL_RISON_STATE_PARAM}=${rison.encode({ time: timeRange })}`;
  }

  return id
    ? `#/edit/${encodeURIComponent(id)}${timeParam}`
    : `#/${LENS_EDIT_BY_VALUE}${timeParam}`;
}

export function getFullPath(id?: string) {
  return `/app/${PLUGIN_ID}${id ? getEditPath(id) : getBasePath()}`;
}

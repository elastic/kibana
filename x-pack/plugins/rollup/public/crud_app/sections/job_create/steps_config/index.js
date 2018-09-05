/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { validateId } from './validate_id';
import { validateIndexPattern } from './validate_index_pattern';
import { validateRollupIndex } from './validate_rollup_index';
import { validateRollupCron } from './validate_rollup_cron';
import { validateRollupPageSize } from './validate_rollup_page_size';

export const STEP_LOGISTICS = 'STEP_LOGISTICS';
export const STEP_DATE_HISTOGRAM = 'STEP_DATE_HISTOGRAM';
export const STEP_GROUPS = 'STEP_GROUPS';
export const STEP_METRICS = 'STEP_METRICS';
export const STEP_REVIEW = 'STEP_REVIEW';

export const stepIds = [
  STEP_LOGISTICS,
  STEP_DATE_HISTOGRAM,
  STEP_GROUPS,
  STEP_METRICS,
  STEP_REVIEW,
];

export const stepIdToStepConfigMap = {
  [STEP_LOGISTICS]: {
    defaultFields: {
      id: '',
      indexPattern: '',
      rollupIndex: '',
      rollupCron: '/30 * * * * ?',
      rollupPageSize: 1000,
    },
    fieldsValidator: fields => {
      const {
        id,
        indexPattern,
        rollupIndex,
        rollupCron,
        rollupPageSize,
      } = fields;

      const errors = {
        id: validateId(id),
        indexPattern: validateIndexPattern(indexPattern),
        rollupIndex: validateRollupIndex(rollupIndex),
        rollupCron: validateRollupCron(rollupCron),
        rollupPageSize: validateRollupPageSize(rollupPageSize),
      };

      return errors;
    },
  },
  [STEP_DATE_HISTOGRAM]: {
    defaultFields: {
      dateHistogramInterval: '1h',
      dateHistogramDelay: null,
      dateHistogramTimeZone: 'UTC',
      dateHistogramField: 'utc_time',
    },
  },
  [STEP_GROUPS]: {
    defaultFields: {
      terms: ['index.keyword'],
      histogram: ['memory'],
      histogramInterval: 5,
    },
  },
  [STEP_METRICS]: {
    defaultFields: {
      metrics: [{
        'field': 'bytes',
        'metrics': ['min', 'max', 'avg']
      }, {
        'field': 'memory',
        'metrics': ['min', 'max', 'avg']
      }],
    },
  },
  [STEP_REVIEW]: {
  },
};

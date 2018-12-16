/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import cloneDeep from 'lodash/lang/cloneDeep';

import { WEEK } from '../../../services';

import { validateId } from './validate_id';
import { validateIndexPattern } from './validate_index_pattern';
import { validateRollupIndex } from './validate_rollup_index';
import { validateRollupCron } from './validate_rollup_cron';
import { validateRollupPageSize } from './validate_rollup_page_size';
import { validateRollupDelay } from './validate_rollup_delay';
import { validateDateHistogramField } from './validate_date_histogram_field';
import { validateDateHistogramInterval } from './validate_date_histogram_interval';
import { validateHistogramInterval } from './validate_histogram_interval';
import { validateMetrics } from './validate_metrics';

export const STEP_LOGISTICS = 'STEP_LOGISTICS';
export const STEP_DATE_HISTOGRAM = 'STEP_DATE_HISTOGRAM';
export const STEP_TERMS = 'STEP_TERMS';
export const STEP_HISTOGRAM = 'STEP_HISTOGRAM';
export const STEP_METRICS = 'STEP_METRICS';
export const STEP_REVIEW = 'STEP_REVIEW';

export const stepIds = [
  STEP_LOGISTICS,
  STEP_DATE_HISTOGRAM,
  STEP_TERMS,
  STEP_HISTOGRAM,
  STEP_METRICS,
  STEP_REVIEW,
];

export const stepIdToStepConfigMap = {
  [STEP_LOGISTICS]: {
    defaultFields: {
      id: '',
      indexPattern: '',
      rollupIndex: '',
      // Every week on Saturday, at 00:00:00
      rollupCron: '0 0 0 ? * 7',
      simpleRollupCron: '0 0 0 ? * 7',
      // The best page size boils down to how much memory the user has, e.g. how many buckets should
      // be accumulated at one time. 1000 is probably a safe size without being too small.
      rollupPageSize: 1000,
      // Though the API doesn't require a delay, in many real-world cases, servers will go down for
      // a few hours as they're being restarted. A delay of 1d would allow them that period to reboot
      // and the "expense" is pretty negligible in most cases: 1 day of extra non-rolled-up data.
      rollupDelay: '1d',
      cronFrequency: WEEK,
      isAdvancedCronVisible: false,
      fieldToPreferredValueMap: {},
    },
    fieldsValidator: fields => {
      const {
        id,
        indexPattern,
        rollupIndex,
        rollupCron,
        rollupPageSize,
        rollupDelay,
      } = fields;

      const errors = {
        id: validateId(id),
        indexPattern: validateIndexPattern(indexPattern, rollupIndex),
        rollupIndex: validateRollupIndex(rollupIndex, indexPattern),
        rollupCron: validateRollupCron(rollupCron),
        rollupPageSize: validateRollupPageSize(rollupPageSize),
        rollupDelay: validateRollupDelay(rollupDelay),
      };

      return errors;
    },
  },
  [STEP_DATE_HISTOGRAM]: {
    defaultFields: {
      dateHistogramField: null,
      dateHistogramInterval: null,
      dateHistogramTimeZone: 'UTC',
    },
    fieldsValidator: fields => {
      const {
        dateHistogramField,
        dateHistogramInterval,
      } = fields;

      const errors = {
        dateHistogramField: validateDateHistogramField(dateHistogramField),
        dateHistogramInterval: validateDateHistogramInterval(dateHistogramInterval),
      };

      return errors;
    },
  },
  [STEP_TERMS]: {
    defaultFields: {
      terms: [],
    },
  },
  [STEP_HISTOGRAM]: {
    defaultFields: {
      histogram: [],
      histogramInterval: undefined,
    },
    fieldsValidator: fields => {
      const {
        histogram,
        histogramInterval,
      } = fields;

      const errors = {
        histogramInterval: validateHistogramInterval(histogram, histogramInterval),
      };

      return errors;
    },
  },
  [STEP_METRICS]: {
    defaultFields: {
      metrics: [],
    },
    fieldsValidator: fields => {
      const {
        metrics,
      } = fields;

      const errors = {
        metrics: validateMetrics(metrics),
      };

      return errors;
    },
  },
  [STEP_REVIEW]: {},
};

export function getAffectedStepsFields(fields, stepsFields) {
  const { indexPattern } = fields;

  const affectedStepsFields = cloneDeep(stepsFields);

  // A new index pattern means we have to clear all of the fields which depend upon it.
  if (indexPattern) {
    affectedStepsFields[STEP_DATE_HISTOGRAM].dateHistogramField = undefined;
    affectedStepsFields[STEP_TERMS].terms = [];
    affectedStepsFields[STEP_HISTOGRAM].histogram = [];
    affectedStepsFields[STEP_METRICS].metrics = [];
  }

  return affectedStepsFields;
}

export function hasErrors(fieldErrors) {
  const errorValues = Object.values(fieldErrors);
  return errorValues.some(error => error !== undefined);
}

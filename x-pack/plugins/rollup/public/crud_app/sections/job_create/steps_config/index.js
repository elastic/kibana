/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep, get, pick } from 'lodash';

import { WEEK } from '../../../../../../../../src/plugins/es_ui_shared/public';

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

/**
 * Map a specific wizard step to two functions:
 *  1. getDefaultFields: (overrides) => object
 *  2. fieldValidations
 *
 * See rollup/public/crud_app/services/jobs.js for more information on override's shape
 */
export const stepIdToStepConfigMap = {
  [STEP_LOGISTICS]: {
    getDefaultFields: (overrides = {}) => {
      // We don't display the simple editor if there are overrides for the rollup's cron
      const isAdvancedCronVisible = !!overrides.rollupCron;

      // The best page size boils down to how much memory the user has, e.g. how many buckets should
      // be accumulated at one time. 1000 is probably a safe size without being too small.
      const rollupPageSize = get(overrides, ['json', 'config', 'page_size'], 1000);
      const clonedRollupId = overrides.id || undefined;
      const id = overrides.id ? `${overrides.id}-copy` : '';

      const defaults = {
        indexPattern: '',
        rollupIndex: '',
        // Every week on Saturday, at 00:00:00
        rollupCron: '0 0 0 ? * 7',
        simpleRollupCron: '0 0 0 ? * 7',
        rollupPageSize,
        // Though the API doesn't require a delay, in many real-world cases, servers will go down for
        // a few hours as they're being restarted. A delay of 1d would allow them that period to reboot
        // and the "expense" is pretty negligible in most cases: 1 day of extra non-rolled-up data.
        rollupDelay: '1d',
        cronFrequency: WEEK,
        fieldToPreferredValueMap: {},
      };

      return {
        ...defaults,
        ...pick(overrides, Object.keys(defaults)),
        id,
        isAdvancedCronVisible,
        rollupPageSize,
        clonedRollupId,
      };
    },
    fieldsValidator: (fields) => {
      const {
        id,
        indexPattern,
        rollupIndex,
        rollupCron,
        rollupPageSize,
        rollupDelay,
        clonedRollupId,
      } = fields;
      return {
        id: validateId(id, clonedRollupId),
        indexPattern: validateIndexPattern(indexPattern, rollupIndex),
        rollupIndex: validateRollupIndex(rollupIndex, indexPattern),
        rollupCron: validateRollupCron(rollupCron),
        rollupPageSize: validateRollupPageSize(rollupPageSize),
        rollupDelay: validateRollupDelay(rollupDelay),
      };
    },
  },
  [STEP_DATE_HISTOGRAM]: {
    getDefaultFields: (overrides = {}) => {
      const defaults = {
        dateHistogramField: null,
        dateHistogramInterval: null,
        dateHistogramTimeZone: 'UTC',
      };

      return {
        ...defaults,
        ...pick(overrides, Object.keys(defaults)),
      };
    },
    fieldsValidator: (fields) => {
      const { dateHistogramField, dateHistogramInterval } = fields;

      return {
        dateHistogramField: validateDateHistogramField(dateHistogramField),
        dateHistogramInterval: validateDateHistogramInterval(dateHistogramInterval),
      };
    },
  },
  [STEP_TERMS]: {
    getDefaultFields: (overrides = {}) => {
      return {
        terms: [],
        ...pick(overrides, ['terms']),
      };
    },
  },
  [STEP_HISTOGRAM]: {
    getDefaultFields: (overrides) => {
      return {
        histogram: [],
        histogramInterval: undefined,
        ...pick(overrides, ['histogram', 'histogramInterval']),
      };
    },
    fieldsValidator: (fields) => {
      const { histogram, histogramInterval } = fields;

      return {
        histogramInterval: validateHistogramInterval(histogram, histogramInterval),
      };
    },
  },
  [STEP_METRICS]: {
    getDefaultFields: (overrides = {}) => {
      return {
        metrics: [],
        ...pick(overrides, ['metrics']),
      };
    },
    fieldsValidator: (fields) => {
      const { metrics } = fields;

      return {
        metrics: validateMetrics(metrics),
      };
    },
  },
  [STEP_REVIEW]: {
    getDefaultFields: () => ({}),
  },
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
  return errorValues.some((error) => error !== undefined);
}

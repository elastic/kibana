/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, pick } from 'lodash';

import { validateDateHistogramField } from './validate_date_histogram_field';
import { validateDateHistogramInterval } from './validate_date_histogram_interval';
import { validateHistogramInterval } from './validate_histogram_interval';
import { validateMetrics } from './validate_metrics';

export const STEP_LOGISTICS = 'STEP_LOGISTICS';
export const STEP_DATE_HISTOGRAM = 'STEP_DATE_HISTOGRAM';
export const STEP_TERMS = 'STEP_TERMS';
export const STEP_HISTOGRAM = 'STEP_HISTOGRAM';
export const STEP_METRICS = 'STEP_METRICS';

export const stepIds = [
  STEP_DATE_HISTOGRAM,
  STEP_TERMS,
  STEP_HISTOGRAM,
  STEP_METRICS,
  STEP_LOGISTICS,
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
      const defaults = {
        rollupIndexIlmPolicy: '',
      };

      return {
        ...defaults,
        ...pick(overrides, Object.keys(defaults)),
      };
    },
    fieldsValidator: () => {
      return {};
    },
  },
  [STEP_DATE_HISTOGRAM]: {
    getDefaultFields: (overrides = {}) => {
      const defaults = {
        dateHistogramField: '@timestamp',
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

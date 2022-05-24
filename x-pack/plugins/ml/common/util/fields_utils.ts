/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ES_FIELD_TYPES } from '@kbn/data-plugin/common';
import {
  Field,
  Aggregation,
  NewJobCaps,
  METRIC_AGG_TYPE,
  RollupFields,
  EVENT_RATE_FIELD_ID,
} from '../types/fields';
import { ML_JOB_AGGREGATION } from '../constants/aggregation_types';

// cross reference fields and aggs.
// fields contain a list of aggs that are compatible, and vice versa.
export function combineFieldsAndAggs(
  fields: Field[],
  aggs: Aggregation[],
  rollupFields: RollupFields
): NewJobCaps {
  const keywordFields = getKeywordFields(fields);
  const textFields = getTextFields(fields);
  const numericalFields = getNumericalFields(fields);
  const ipFields = getIpFields(fields);
  const geoFields = getGeoFields(fields);

  const isRollup = Object.keys(rollupFields).length > 0;
  const mix = mixFactory(isRollup, rollupFields);

  aggs.forEach((a) => {
    if (a.type === METRIC_AGG_TYPE && a.fields !== undefined) {
      switch (a.id) {
        case ML_JOB_AGGREGATION.LAT_LONG:
          geoFields.forEach((f) => mix(f, a));
          break;
        case ML_JOB_AGGREGATION.INFO_CONTENT:
        case ML_JOB_AGGREGATION.HIGH_INFO_CONTENT:
        case ML_JOB_AGGREGATION.LOW_INFO_CONTENT:
          textFields.forEach((f) => mix(f, a));
        case ML_JOB_AGGREGATION.DISTINCT_COUNT:
        case ML_JOB_AGGREGATION.HIGH_DISTINCT_COUNT:
        case ML_JOB_AGGREGATION.LOW_DISTINCT_COUNT:
          // distinct count (i.e. cardinality) takes keywords, ips
          // as well as numerical fields
          keywordFields.forEach((f) => mix(f, a));
          ipFields.forEach((f) => mix(f, a));
        // note, no break to fall through to add numerical fields.
        default:
          // all other aggs take numerical fields
          numericalFields.forEach((f) => {
            mix(f, a);
          });
          break;
      }
    }
  });

  return {
    aggs,
    fields: isRollup ? filterFields(fields) : fields,
  };
}

// remove fields that have no aggs associated to them, unless they are date fields
function filterFields(fields: Field[]): Field[] {
  return fields.filter(
    (f) => f.aggs && (f.aggs.length > 0 || (f.aggs.length === 0 && f.type === ES_FIELD_TYPES.DATE))
  );
}

// returns a mix function that is used to cross-reference aggs and fields.
// wrapped in a provider to allow filtering based on rollup job capabilities
function mixFactory(isRollup: boolean, rollupFields: RollupFields) {
  return function mix(field: Field, agg: Aggregation): void {
    if (
      isRollup === false ||
      (rollupFields[field.id] && rollupFields[field.id].find((f) => f.agg === agg.dslName))
    ) {
      if (field.aggs !== undefined) {
        field.aggs.push(agg);
      }
      if (agg.fields !== undefined) {
        agg.fields.push(field);
      }
    }
  };
}

function getKeywordFields(fields: Field[]): Field[] {
  return fields.filter((f) => f.type === ES_FIELD_TYPES.KEYWORD);
}

function getTextFields(fields: Field[]): Field[] {
  return fields.filter((f) => f.type === ES_FIELD_TYPES.TEXT);
}

function getIpFields(fields: Field[]): Field[] {
  return fields.filter((f) => f.type === ES_FIELD_TYPES.IP);
}

function getNumericalFields(fields: Field[]): Field[] {
  return fields.filter(
    (f) =>
      f.type === ES_FIELD_TYPES.LONG ||
      f.type === ES_FIELD_TYPES.UNSIGNED_LONG ||
      f.type === ES_FIELD_TYPES.INTEGER ||
      f.type === ES_FIELD_TYPES.SHORT ||
      f.type === ES_FIELD_TYPES.BYTE ||
      f.type === ES_FIELD_TYPES.DOUBLE ||
      f.type === ES_FIELD_TYPES.FLOAT ||
      f.type === ES_FIELD_TYPES.HALF_FLOAT ||
      f.type === ES_FIELD_TYPES.SCALED_FLOAT
  );
}

function getGeoFields(fields: Field[]): Field[] {
  return fields.filter(
    (f) => f.type === ES_FIELD_TYPES.GEO_POINT || f.type === ES_FIELD_TYPES.GEO_SHAPE
  );
}

/**
 * Sort fields by name, keeping event rate at the beginning
 */
export function sortFields(fields: Field[]) {
  if (fields.length === 0) {
    return fields;
  }

  let eventRate: Field | undefined;
  if (fields[0].id === EVENT_RATE_FIELD_ID) {
    [eventRate] = fields.splice(0, 1);
  }
  fields.sort((a, b) => a.name.localeCompare(b.name));
  if (eventRate !== undefined) {
    fields.splice(0, 0, eventRate);
  }
  return fields;
}

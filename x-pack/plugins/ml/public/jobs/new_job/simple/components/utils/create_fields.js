/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { EVENT_RATE_COUNT_FIELD } from 'plugins/ml/jobs/new_job/simple/components/constants/general';
import { ML_JOB_FIELD_TYPES, KBN_FIELD_TYPES } from 'plugins/ml/../common/constants/field_types';
import { getSafeAggregationName } from 'plugins/ml/../common/util/job_utils';
import { kbnTypeToMLJobType } from 'plugins/ml/util/field_types_utils';

export function createFields(scope, indexPattern) {
  const isPopulation = scope.formConfig.hasOwnProperty('overField');
  const agg = scope.formConfig.agg;
  let fields = [];
  let categoryFields = [];
  scope.ui.fields = [];
  agg.type.params.forEach(param => {
    if (param.name === 'field') {
      fields = getIndexedFields(indexPattern, [KBN_FIELD_TYPES.NUMBER, KBN_FIELD_TYPES.STRING, KBN_FIELD_TYPES.IP]);
    }
    if (param.name === 'customLabel') {
      categoryFields = getIndexedFields(indexPattern, [KBN_FIELD_TYPES.STRING, KBN_FIELD_TYPES.IP]);
    }
  });

  const countAgg = { type: scope.ui.aggTypeOptions.find(o => o.name === 'count') };

  const eventRateField = {
    id: EVENT_RATE_COUNT_FIELD,
    name: 'event rate',
    tooltip: 'System defined field',
    isCountField: true,
    agg: countAgg,
    mlType: ML_JOB_FIELD_TYPES.NUMBER,
    splitField: undefined,
    firstSplitFieldName: undefined,
    cardLabels: undefined
  };
  if (isPopulation) {
    // population page, add additional items
    eventRateField.splitField = undefined;
    eventRateField.firstSplitFieldName = undefined;
    eventRateField.cardLabels = undefined;
  }
  scope.ui.fields.push(eventRateField);

  const cardinalityAgg = { type: scope.ui.aggTypeOptions.find(o => o.name === 'cardinality') };
  fields.forEach((field, i) => {
    const id = getSafeAggregationName(field.displayName, i);
    const f = {
      id,
      name: field.displayName,
      tooltip: field.displayName,
      // if the field is a keyword or an ip, set the default agg to be cardinality
      agg: (field.mlType === ML_JOB_FIELD_TYPES.KEYWORD || field.mlType === ML_JOB_FIELD_TYPES.IP) ? { ...cardinalityAgg } : { ...agg },
      mlType: field.mlType,
    };
    if (isPopulation) {
      // population page, add additional items
      f.splitField = undefined;
      f.firstSplitFieldName = undefined;
      f.cardLabels = undefined;
    }
    scope.ui.fields.push(f);
  });

  categoryFields.forEach(field => {
    scope.ui.splitFields.push(field);
    if (isPopulation) {
      scope.ui.overFields.push(field);
    }
  });
}

export function getIndexedFields(indexPattern, fieldTypes) {
  let fields = indexPattern.fields.raw.filter(f => f.aggregatable === true);

  if (fieldTypes) {
    // filter out _type, _id and _index and scripted fields
    fields = fields.filter(f =>
      (f.displayName !== '_type' &&
      f.displayName !== '_id' &&
      f.displayName !== '_index' &&
      f.scripted !== true));
    // we only want fields which the type is in fieldTypes
    fields = fields.filter(f => fieldTypes.find(t => t === f.type));
    // create the mlType property
    fields.forEach(f => f.mlType = kbnTypeToMLJobType(f));
    // sort the fields
    fields = fields.sort(orderBy(['name', 'type']));
  }
  return fields;
}

function orderBy(items) {
  return (a, b) => {
    let result = 0;
    items.forEach(i => {
      const aa = a[i].toLowerCase();
      const bb = b[i].toLowerCase();
      if (aa < bb) {
        result = -1;
      } else if (aa > bb) {
        result = 1;
      }
    });
    return result || 0;
  };
}


/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash';
import { aggregations } from './aggregations';
import { Field, Aggregation } from '../../../../common/types/fields';
import { ES_FIELD_TYPES } from '../../../../common/constants/field_types';

const METRIC_AGG_TYPE: string = 'metrics';

const supportedTypes: string[] = [
  ES_FIELD_TYPES.DATE,
  ES_FIELD_TYPES.KEYWORD,
  ES_FIELD_TYPES.DOUBLE,
  ES_FIELD_TYPES.FLOAT,
  ES_FIELD_TYPES.LONG,
  ES_FIELD_TYPES.TEXT,
];

export function fieldServiceProvider(indexPattern: string, callWithRequest: any) {
  return new FieldsService(indexPattern, callWithRequest);
}

class FieldsService {
  private _indexPattern: string;
  private _callWithRequest: (func: string, params: any) => void;

  constructor(indexPattern: string, callWithRequest: any) {
    this._indexPattern = indexPattern;
    this._callWithRequest = callWithRequest;
  }

  private async loadFieldCaps(): Promise<any> {
    return this._callWithRequest('fieldCaps', {
      index: this._indexPattern,
      fields: '*',
    });
  }

  private async createFields(): Promise<Field[]> {
    const fieldCaps = await this.loadFieldCaps();
    const fields: Field[] = [];
    if (fieldCaps.fields) {
      Object.keys(fieldCaps.fields).forEach(k => {
        const fc = fieldCaps.fields[k];
        const firstKey = Object.keys(fc)[0];
        if (firstKey !== undefined) {
          const field = fc[firstKey];
          if (supportedTypes.includes(field.type) === true) {
            fields.push({
              id: k,
              name: k,
              type: field.type,
              aggregatable: field.aggregatable,
              aggs: [],
            });
          }
        }
      });
    }
    return fields;
  }

  public async getData() {
    const fields = await this.createFields();
    const aggs = cloneDeep(aggregations);
    return combineFieldsAndAggs(fields, aggs);
  }
}

function combineFieldsAndAggs(fields: Field[], aggs: Aggregation[]) {
  const textAndKeywordFields = getTextAndKeywordFields(fields);
  const numericalFields = getNumericalFields(fields);

  aggs.forEach(a => {
    if (a.type === METRIC_AGG_TYPE) {
      switch (a.kibanaName) {
        case 'cardinality':
          textAndKeywordFields.forEach(f => {
            mix(f, a);
          });
          numericalFields.forEach(f => {
            mix(f, a);
          });
          break;
        case 'count':
          break;
        default:
          numericalFields.forEach(f => {
            mix(f, a);
          });
          break;
      }
    }
  });

  return {
    aggs,
    fields,
  };
}

function mix(field: Field, agg: Aggregation) {
  if (field.aggs !== undefined) {
    field.aggs.push(agg);
  }
  if (agg.fields !== undefined) {
    agg.fields.push(field);
  }
}

function getTextAndKeywordFields(fields: Field[]): Field[] {
  return fields.filter(f => f.type === ES_FIELD_TYPES.KEYWORD || f.type === ES_FIELD_TYPES.TEXT);
}

function getNumericalFields(fields: Field[]): Field[] {
  return fields.filter(
    f =>
      f.type === ES_FIELD_TYPES.DOUBLE ||
      f.type === ES_FIELD_TYPES.FLOAT ||
      f.type === ES_FIELD_TYPES.LONG
  );
}

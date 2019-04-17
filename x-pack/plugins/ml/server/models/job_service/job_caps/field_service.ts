/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash';
import { Request } from 'src/legacy/server/kbn_server';
import { Field, Aggregation } from '../../../../common/types/fields';
import { ES_FIELD_TYPES } from '../../../../common/constants/field_types';
import { getRollupConfig, RollupConfig } from './rollup';
import { aggregations } from './aggregations';
import { CallWithRequestType } from '../../../client/elasticsearch_ml';

const METRIC_AGG_TYPE: string = 'metrics';

const supportedTypes: string[] = [
  ES_FIELD_TYPES.DATE,
  ES_FIELD_TYPES.KEYWORD,
  ES_FIELD_TYPES.DOUBLE,
  ES_FIELD_TYPES.FLOAT,
  ES_FIELD_TYPES.LONG,
  ES_FIELD_TYPES.TEXT,
];

export function fieldServiceProvider(
  indexPattern: string,
  isRollup: boolean,
  callWithRequest: CallWithRequestType,
  request: Request
) {
  return new FieldsService(indexPattern, isRollup, callWithRequest, request);
}

class FieldsService {
  private _indexPattern: string;
  private _isRollup: boolean;
  private _callWithRequest: CallWithRequestType;
  private _request: Request;

  constructor(
    indexPattern: string,
    isRollup: boolean,
    callWithRequest: CallWithRequestType,
    request: Request
  ) {
    this._indexPattern = indexPattern;
    this._isRollup = isRollup;
    this._callWithRequest = callWithRequest;
    this._request = request;
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
    const aggs = cloneDeep(aggregations);
    const fields: Field[] = await this.createFields();

    let rollupConfig: RollupConfig | null = null;
    if (this._isRollup) {
      rollupConfig = await getRollupConfig(
        this._indexPattern,
        this._callWithRequest,
        this._request
      );
    }

    return await combineFieldsAndAggs(fields, aggs, rollupConfig);
  }
}

async function combineFieldsAndAggs(
  fields: Field[],
  aggs: Aggregation[],
  rollupConfig: RollupConfig | null
) {
  const textAndKeywordFields = getTextAndKeywordFields(fields);
  const numericalFields = getNumericalFields(fields);

  const mix = mixFactory(rollupConfig);

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
    aggs: filterAggs(aggs),
    fields: filterFields(fields),
  };
}

function filterFields(fields: Field[]) {
  return fields.filter(f => f.aggs && f.aggs.length);
}

function filterAggs(aggs: Aggregation[]) {
  return aggs.filter(a => a.fields && a.fields.length);
}

function mixFactory(rollupConfig: RollupConfig | null) {
  return function mix(field: Field, agg: Aggregation) {
    if (
      rollupConfig === null ||
      (rollupConfig.fields[field.id] &&
        rollupConfig.fields[field.id].find(f => f.agg === agg.kibanaName))
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

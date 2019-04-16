/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexPattern } from 'ui/index_patterns';
import { Field, Aggregation } from '../../common/types/fields';
import { ml } from '../services/ml_api_service';

class FieldsService {
  private _fields: Field[];
  private _aggs: Aggregation[];

  constructor() {
    this._fields = [];
    this._aggs = [];
  }

  get fields(): Field[] {
    return this._fields;
  }

  get aggs(): Aggregation[] {
    return this._aggs;
  }

  private createObjects(resp: any, indexPatternTitle: string) {
    const results = resp[indexPatternTitle];

    const aggs: Aggregation[] = [];
    const aggMap: { [id: string]: Aggregation } = {};
    const aggIdMap: { [id: string]: string[] } = {};

    const fields: Field[] = [];

    if (results !== undefined) {
      results.aggs.forEach((a: Aggregation) => {
        const agg = {
          ...a,
          fields: [],
        };
        aggMap[agg.id] = agg;
        aggs.push(agg);
      });

      results.fields.forEach((f: Field) => {
        const field = {
          ...f,
          aggs: [],
        };
        if (field.aggIds !== undefined) {
          aggIdMap[field.id] = field.aggIds;
        }
        fields.push(field);
      });

      fields.forEach((field: Field) => {
        aggIdMap[field.id].forEach((aggId: string) => {
          const agg = aggMap[aggId];
          if (agg.fields === undefined) {
            agg.fields = [];
          }
          if (field.aggs === undefined) {
            field.aggs = [];
          }
          agg.fields.push(field);
          field.aggs.push(agg);
        });
      });
    }

    fields.forEach(f => delete f.aggIds);
    aggs.forEach(a => delete a.fieldIds);

    return {
      fields,
      aggs,
    };
  }

  public async initializeFromIndexPattern(indexPattern: IndexPattern) {
    const resp = await ml.jobs.jobCaps(indexPattern.title);
    const { fields, aggs } = this.createObjects(resp, indexPattern.title);
    this._fields = fields;
    this._aggs = aggs;
  }
}

export const fieldsService = new FieldsService();

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexPattern } from 'ui/index_patterns';
import { Field, Aggregation, AggId } from '../../common/types/fields';
import { ml } from '../services/ml_api_service';
import { Dictionary } from '../../common/types/common';

// the type property is missing from the official IndexPattern interface
interface IndexPatternWithType extends IndexPattern {
  type?: string;
}

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

  // using the response from the endpoint, create the field and aggs objects
  // when transported over the endpoint, the fields and aggs contain lists of ids of the
  // fields and aggs they are related to.
  // this function creates lists of real Fields and Aggregations and cross references them.
  // the list if ids are then deleted.
  private createObjects(resp: any, indexPatternTitle: string) {
    const results = resp[indexPatternTitle];

    const fields: Field[] = [];
    const aggs: Aggregation[] = [];
    // for speed, a map of aggregations, keyed on their id
    const aggMap: Dictionary<Aggregation> = {};
    // for speed, a map of aggregation id lists from a field, keyed on the field id
    const aggIdMap: Dictionary<AggId[]> = {};

    if (results !== undefined) {
      results.aggs.forEach((a: Aggregation) => {
        // copy the agg and add a Fields list
        const agg: Aggregation = {
          ...a,
          fields: [],
        };
        aggMap[agg.id] = agg;
        aggs.push(agg);
      });

      results.fields.forEach((f: Field) => {
        // copy the field and add an Aggregations list
        const field: Field = {
          ...f,
          aggs: [],
        };
        if (field.aggIds !== undefined) {
          aggIdMap[field.id] = field.aggIds;
        }
        fields.push(field);
      });

      // loop through the fields and add populate their aggs lists.
      // for each agg added to a field, also add that field to the agg's field list
      fields.forEach((field: Field) => {
        aggIdMap[field.id].forEach((aggId: AggId) => {
          mix(field, aggMap[aggId]);
        });
      });
    }

    // the aggIds and fieldIds lists are no longer needed as we've created
    // lists of real fields and aggs
    fields.forEach(f => delete f.aggIds);
    aggs.forEach(a => delete a.fieldIds);

    return {
      fields,
      aggs,
    };
  }

  public async initializeFromIndexPattern(indexPattern: IndexPatternWithType) {
    const resp = await ml.jobs.jobCaps(indexPattern.title, indexPattern.type === 'rollup');
    const { fields, aggs } = this.createObjects(resp, indexPattern.title);
    this._fields = fields;
    this._aggs = aggs;
  }
}

function mix(field: Field, agg: Aggregation) {
  if (agg.fields === undefined) {
    agg.fields = [];
  }
  if (field.aggs === undefined) {
    field.aggs = [];
  }
  agg.fields.push(field);
  field.aggs.push(agg);
}

export const fieldsService = new FieldsService();

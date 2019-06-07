/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexPatternWithType } from '../../common/types/kibana';
import { Field, Aggregation, AggId, FieldId, NewJobCaps } from '../../common/types/fields';
import { ml } from './ml_api_service';

// called in the angular routing resolve block to initialize the
// newJobCapsService with the currently selected index pattern
export function loadNewJobCapabilities(indexPatterns: any, $route: Record<string, any>) {
  return new Promise(resolve => {
    indexPatterns
      .get($route.current.params.index)
      .then(async (indexPattern: IndexPatternWithType) => {
        await newJobCapsService.initializeFromIndexPattern(indexPattern);
        resolve(newJobCapsService.newJobCaps);
      })
      .catch((error: any) => {
        resolve(error);
      });
  });
}

class NewJobCapsService {
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

  get newJobCaps(): NewJobCaps {
    return {
      fields: this._fields,
      aggs: this._aggs,
    };
  }

  public async initializeFromIndexPattern(indexPattern: IndexPatternWithType) {
    try {
      const resp = await ml.jobs.newJobCaps(indexPattern.title, indexPattern.type === 'rollup');
      const { fields, aggs } = createObjects(resp, indexPattern.title);
      this._fields = fields;
      this._aggs = aggs;
    } catch (error) {
      console.error('Unable to load new job capabilities', error); // eslint-disable-line no-console
    }
  }
}

// using the response from the endpoint, create the field and aggs objects
// when transported over the endpoint, the fields and aggs contain lists of ids of the
// fields and aggs they are related to.
// this function creates lists of real Fields and Aggregations and cross references them.
// the list if ids are then deleted.
function createObjects(resp: any, indexPatternTitle: string) {
  const results = resp[indexPatternTitle];

  const fields: Field[] = [];
  const aggs: Aggregation[] = [];
  // for speed, a map of aggregations, keyed on their id

  // create a AggMap type to allow an enum (AggId) to be used as a Record key and then initialized with {}
  type AggMap = Record<AggId, Aggregation>;
  const aggMap: AggMap = {} as AggMap;
  // for speed, a map of aggregation id lists from a field, keyed on the field id
  const aggIdMap: Record<FieldId, AggId[]> = {};

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

    // loop through the fields and populate their aggs lists.
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

export const newJobCapsService = new NewJobCapsService();

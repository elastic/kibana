/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ES_FIELD_TYPES } from '@kbn/data-plugin/public';
import { Aggregation, Field, NewJobCaps } from '../../../../common/types/fields';

// create two lists, one removing text fields if there are keyword equivalents and vice versa
export function processTextAndKeywordFields(fields: Field[]) {
  const keywordIds = fields.filter((f) => f.type === ES_FIELD_TYPES.KEYWORD).map((f) => f.id);
  const textIds = fields.filter((f) => f.type === ES_FIELD_TYPES.TEXT).map((f) => f.id);

  const fieldsPreferringKeyword = fields.filter(
    (f) =>
      f.type !== ES_FIELD_TYPES.TEXT ||
      (f.type === ES_FIELD_TYPES.TEXT && keywordIds.includes(`${f.id}.keyword`) === false)
  );

  const fieldsPreferringText = fields.filter(
    (f) =>
      f.type !== ES_FIELD_TYPES.KEYWORD ||
      (f.type === ES_FIELD_TYPES.KEYWORD &&
        textIds.includes(f.id.replace(/\.keyword$/, '')) === false)
  );

  return { fieldsPreferringKeyword, fieldsPreferringText };
}

export class NewJobCapabilitiesServiceBase {
  protected _fields: Field[];
  protected _aggs: Aggregation[];

  constructor() {
    this._fields = [];
    this._aggs = [];
  }

  public get fields(): Field[] {
    return this._fields;
  }

  public get aggs(): Aggregation[] {
    return this._aggs;
  }

  public get newJobCaps(): NewJobCaps {
    return {
      fields: this._fields,
      aggs: this._aggs,
    };
  }

  public getFieldById(id: string): Field | null {
    const field = this._fields.find((f) => f.id === id);
    return field === undefined ? null : field;
  }

  public getAggById(id: string): Aggregation | null {
    const agg = this._aggs.find((f) => f.id === id);
    return agg === undefined ? null : agg;
  }
}

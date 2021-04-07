/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Field, Aggregation } from '../../../common/types/fields';
import {
  ES_FIELD_TYPES,
  IIndexPattern,
  IndexPatternsContract,
} from '../../../../../../src/plugins/data/public';
import { getIndexPatternAndSavedSearch } from '../util/index_utils';
import { ml } from './ml_api_service';

interface FieldsAndAggs {
  fields: Field[];
  aggs: Aggregation[];
}

// called in the routing resolve block to initialize the
// newJobCapsService with the currently selected index pattern
export function loadAnalyticsFields(
  indexPatternId: string,
  savedSearchId: string,
  indexPatterns: IndexPatternsContract
) {
  return new Promise(async (resolve, reject) => {
    if (indexPatternId !== undefined) {
      // index pattern is being used
      const indexPattern: IIndexPattern = await indexPatterns.get(indexPatternId);
      await analyticsFieldsService.initializeFromIndexPattern(indexPattern);
      resolve(analyticsFieldsService.fieldsAndAggs);
    } else if (savedSearchId !== undefined) {
      // saved search is being used
      // load the index pattern from the saved search
      const { indexPattern } = await getIndexPatternAndSavedSearch(savedSearchId);
      if (indexPattern === null) {
        // eslint-disable-next-line no-console
        console.error('Cannot retrieve index pattern from saved search');
        reject();
        return;
      }
      await analyticsFieldsService.initializeFromIndexPattern(indexPattern);
      resolve(analyticsFieldsService.fieldsAndAggs);
    } else {
      reject();
    }
  });
}

// create two lists, one removing text fields if there are keyword equivalents and vice versa
function processTextAndKeywordFields(fields: Field[]) {
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

// Keep top nested field and remove all <nested_field>.* fields
function removeNestedFieldChildren(resp: any, indexPatternTitle: string) {
  const results = resp[indexPatternTitle];
  const fields: Field[] = [];
  const nestedFields: Record<string, boolean> = {};

  if (results !== undefined) {
    results.fields.forEach((field: Field) => {
      if (field.type === ES_FIELD_TYPES.NESTED && nestedFields[field.name] === undefined) {
        nestedFields[field.name] = true;
        fields.push(field);
      }
    });

    if (Object.keys(nestedFields).length > 0) {
      results.fields.forEach((field: Field) => {
        if (field.type !== ES_FIELD_TYPES.NESTED) {
          const fieldNameParts = field.name.split('.');
          const rootOfField = fieldNameParts.shift();
          if (rootOfField && nestedFields[rootOfField] === undefined) {
            fields.push(field);
          }
        }
      });
    } else {
      fields.push(...results.fields);
    }
  }
  return fields;
}

class AnalyticsFieldsService {
  private _fields: Field[] = [];
  private _aggs: Aggregation[] = [];

  public get fields(): Field[] {
    return this._fields;
  }

  public get aggs(): Aggregation[] {
    return this._aggs;
  }

  public get fieldsAndAggs(): FieldsAndAggs {
    return {
      fields: this._fields,
      aggs: this._aggs,
    };
  }

  public async initializeFromIndexPattern(indexPattern: IIndexPattern) {
    try {
      const resp = await ml.dataFrameAnalytics.analyticsFields(
        indexPattern.title,
        indexPattern.type === 'rollup'
      );

      const allFields = removeNestedFieldChildren(resp, indexPattern.title);

      const { fieldsPreferringKeyword } = processTextAndKeywordFields(allFields);

      // set the main fields list to contain fields which have been filtered to prefer
      // keyword fields over text fields.
      // e.g. if foo.keyword and foo exist, don't add foo to the list.
      this._fields = fieldsPreferringKeyword;
    } catch (error) {
      console.error('Unable to load analytics index fields', error); // eslint-disable-line no-console
    }
  }

  public getFieldById(id: string): Field | null {
    const field = this._fields.find((f) => f.id === id);
    return field === undefined ? null : field;
  }
}

export const analyticsFieldsService = new AnalyticsFieldsService();

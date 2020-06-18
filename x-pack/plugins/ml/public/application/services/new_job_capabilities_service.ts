/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Field,
  Aggregation,
  AggId,
  FieldId,
  NewJobCaps,
  EVENT_RATE_FIELD_ID,
} from '../../../common/types/fields';
import {
  ES_FIELD_TYPES,
  IIndexPattern,
  IndexPatternsContract,
} from '../../../../../../src/plugins/data/public';
import { ml } from './ml_api_service';
import { getIndexPatternAndSavedSearch } from '../util/index_utils';

// called in the angular routing resolve block to initialize the
// newJobCapsService with the currently selected index pattern
export function loadNewJobCapabilities(
  indexPatternId: string,
  savedSearchId: string,
  indexPatterns: IndexPatternsContract
) {
  return new Promise(async (resolve, reject) => {
    if (indexPatternId !== undefined) {
      // index pattern is being used
      const indexPattern: IIndexPattern = await indexPatterns.get(indexPatternId);
      await newJobCapsService.initializeFromIndexPattern(indexPattern);
      resolve(newJobCapsService.newJobCaps);
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
      await newJobCapsService.initializeFromIndexPattern(indexPattern);
      resolve(newJobCapsService.newJobCaps);
    } else {
      reject();
    }
  });
}

const categoryFieldTypes = [ES_FIELD_TYPES.TEXT, ES_FIELD_TYPES.KEYWORD, ES_FIELD_TYPES.IP];

class NewJobCapsService {
  private _fields: Field[] = [];
  private _catFields: Field[] = [];
  private _dateFields: Field[] = [];
  private _aggs: Aggregation[] = [];
  private _includeEventRateField: boolean = true;
  private _removeTextFields: boolean = true;

  public get fields(): Field[] {
    return this._fields;
  }

  public get catFields(): Field[] {
    return this._catFields;
  }

  public get dateFields(): Field[] {
    return this._dateFields;
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

  public get categoryFields(): Field[] {
    return this._fields.filter((f) => categoryFieldTypes.includes(f.type));
  }

  public async initializeFromIndexPattern(
    indexPattern: IIndexPattern,
    includeEventRateField = true,
    removeTextFields = true
  ) {
    try {
      this._includeEventRateField = includeEventRateField;
      this._removeTextFields = removeTextFields;

      const resp = await ml.jobs.newJobCaps(indexPattern.title, indexPattern.type === 'rollup');
      const { fields: allFields, aggs } = createObjects(resp, indexPattern.title);

      if (this._includeEventRateField === true) {
        addEventRateField(aggs, allFields);
      }

      const { fieldsPreferringKeyword, fieldsPreferringText } = processTextAndKeywordFields(
        allFields
      );
      const catFields = fieldsPreferringText.filter(
        (f) => f.type === ES_FIELD_TYPES.KEYWORD || f.type === ES_FIELD_TYPES.TEXT
      );
      const dateFields = fieldsPreferringText.filter((f) => f.type === ES_FIELD_TYPES.DATE);
      const fields = this._removeTextFields ? fieldsPreferringKeyword : allFields;

      // set the main fields list to contain fields which have been filtered to prefer
      // keyword fields over text fields.
      // e.g. if foo.keyword and foo exist, don't add foo to the list.
      this._fields = fields;
      // set the category fields to contain fields which have been filtered to prefer text fields.
      this._catFields = catFields;
      this._dateFields = dateFields;
      this._aggs = aggs;
    } catch (error) {
      console.error('Unable to load new job capabilities', error); // eslint-disable-line no-console
    }
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
      // create the aggs list
      // only adding a fields list if there is a fieldIds list
      const agg: Aggregation = {
        ...a,
        ...(a.fieldIds !== undefined ? { fields: [] } : {}),
      };
      aggMap[agg.id] = agg;
      aggs.push(agg);
    });

    results.fields.forEach((f: Field) => {
      // create the fields list
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
  fields.forEach((f) => delete f.aggIds);
  aggs.forEach((a) => delete a.fieldIds);

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

function addEventRateField(aggs: Aggregation[], fields: Field[]) {
  const eventRateField: Field = {
    id: EVENT_RATE_FIELD_ID,
    name: 'Event rate',
    type: ES_FIELD_TYPES.INTEGER,
    aggregatable: true,
    aggs: [],
  };

  aggs.forEach((a) => {
    if (eventRateField.aggs !== undefined && a.fields === undefined) {
      // if the agg's field list is undefined, it is a fieldless aggregation and
      // so can only be used with the event rate field.
      a.fields = [eventRateField];
      eventRateField.aggs.push(a);
    }
  });
  fields.splice(0, 0, eventRateField);
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

export const newJobCapsService = new NewJobCapsService();

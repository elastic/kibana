/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ES_FIELD_TYPES } from '@kbn/data-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import {
  Field,
  Aggregation,
  AggId,
  FieldId,
  EVENT_RATE_FIELD_ID,
} from '../../../../common/types/fields';
import { ml } from '../ml_api_service';
import { processTextAndKeywordFields, NewJobCapabilitiesServiceBase } from './new_job_capabilities';

const categoryFieldTypes = [ES_FIELD_TYPES.TEXT, ES_FIELD_TYPES.KEYWORD, ES_FIELD_TYPES.IP];

class NewJobCapsService extends NewJobCapabilitiesServiceBase {
  private _catFields: Field[] = [];
  private _dateFields: Field[] = [];
  private _includeEventRateField: boolean = true;
  private _removeTextFields: boolean = true;

  public get catFields(): Field[] {
    return this._catFields;
  }

  public get dateFields(): Field[] {
    return this._dateFields;
  }

  public get categoryFields(): Field[] {
    return filterCategoryFields(this._fields);
  }

  public async initializeFromDataVIew(
    dataView: DataView,
    includeEventRateField = true,
    removeTextFields = true
  ) {
    try {
      this._includeEventRateField = includeEventRateField;
      this._removeTextFields = removeTextFields;

      const resp = await ml.jobs.newJobCaps(dataView.title, dataView.type === 'rollup');
      const { fields: allFields, aggs } = createObjects(resp, dataView.title);

      if (this._includeEventRateField === true) {
        addEventRateField(aggs, allFields);
      }

      const { fieldsPreferringKeyword, fieldsPreferringText } =
        processTextAndKeywordFields(allFields);
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

export function filterCategoryFields(fields: Field[]) {
  return fields.filter((f) => categoryFieldTypes.includes(f.type));
}

export const newJobCapsService = new NewJobCapsService();

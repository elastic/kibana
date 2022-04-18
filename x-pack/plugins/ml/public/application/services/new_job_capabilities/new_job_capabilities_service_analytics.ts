/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ES_FIELD_TYPES } from '@kbn/data-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { Field, NewJobCapsResponse } from '../../../../common/types/fields';
import { processTextAndKeywordFields, NewJobCapabilitiesServiceBase } from './new_job_capabilities';
import { ml } from '../ml_api_service';

// Keep top nested field and remove all <nested_field>.* fields
export function removeNestedFieldChildren(resp: NewJobCapsResponse, indexPatternTitle: string) {
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

class NewJobCapsServiceAnalytics extends NewJobCapabilitiesServiceBase {
  public async initializeFromDataVIew(dataView: DataView) {
    try {
      const resp: NewJobCapsResponse = await ml.dataFrameAnalytics.newJobCapsAnalytics(
        dataView.title,
        dataView.type === 'rollup'
      );

      const allFields = removeNestedFieldChildren(resp, dataView.title);

      const { fieldsPreferringKeyword } = processTextAndKeywordFields(allFields);

      // set the main fields list to contain fields which have been filtered to prefer
      // keyword fields over text fields.
      // e.g. if foo.keyword and foo exist, don't add foo to the list.
      this._fields = fieldsPreferringKeyword;
    } catch (error) {
      console.error('Unable to load analytics index fields', error); // eslint-disable-line no-console
    }
  }
}

export const newJobCapsServiceAnalytics = new NewJobCapsServiceAnalytics();

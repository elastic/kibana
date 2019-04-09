/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ES_FIELD_TYPES,
  KBN_FIELD_TYPES,
  ML_JOB_FIELD_TYPES
} from '../constants/field_types';

import { getFieldTypeByKeyword } from './field_types';

describe('Getting a field type name by passing what it is stored in constants', () => {
  it('should returns all ES_FIELD_TYPES exactly correct values', () => {

    const esKeys = Object.keys(ES_FIELD_TYPES);
    const receivedEsTypes = {};
    esKeys.forEach(key => {
      receivedEsTypes[key] = getFieldTypeByKeyword('ES_FIELD_TYPES', ES_FIELD_TYPES[key]);
    });

    expect(receivedEsTypes).toEqual(ES_FIELD_TYPES);
  });
  it('should returns all KBN_FIELD_TYPES exactly correct values', () => {

    const esKeys = Object.keys(KBN_FIELD_TYPES);
    const receivedEsTypes = {};
    esKeys.forEach(key => {
      receivedEsTypes[key] = getFieldTypeByKeyword('KBN_FIELD_TYPES', KBN_FIELD_TYPES[key]);
    });

    expect(receivedEsTypes).toEqual(KBN_FIELD_TYPES);
  });
  it('should returns all ML_JOB_FIELD_TYPES exactly correct values', () => {

    const esKeys = Object.keys(ML_JOB_FIELD_TYPES);
    const receivedEsTypes = {};
    esKeys.forEach(key => {
      receivedEsTypes[key] = getFieldTypeByKeyword('ML_JOB_FIELD_TYPES', ML_JOB_FIELD_TYPES[key]);
    });

    expect(receivedEsTypes).toEqual(ML_JOB_FIELD_TYPES);
  });
});

describe('Getting a field type name by passing unknown (random) string keyword', () => {
  it(`should returns null from ES_FIELD_TYPES`, () => {
    expect(
      getFieldTypeByKeyword('ES_FIELD_TYPES', 'asd')
    ).toBe(null);
  });
  it(`should returns null from KBN_FIELD_TYPES`, () => {
    expect(
      getFieldTypeByKeyword('KBN_FIELD_TYPES', 'asd')
    ).toBe(null);
  });
  it(`should returns null from ML_JOB_FIELD_TYPES`, () => {
    expect(
      getFieldTypeByKeyword('ML_JOB_FIELD_TYPES', 'asd')
    ).toBe(null);
  });
});

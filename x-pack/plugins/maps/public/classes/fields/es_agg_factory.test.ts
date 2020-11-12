/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { esAggFieldsFactory } from './es_agg_field';
import { AGG_TYPE, FIELD_ORIGIN } from '../../../common/constants';

describe('esAggFieldsFactory', () => {
  test('Should only create top terms field when term field is not provided', () => {
    const fields = esAggFieldsFactory(
      { type: AGG_TYPE.TERMS },
      mockEsAggSource,
      FIELD_ORIGIN.SOURCE
    );
    expect(fields.length).toBe(1);
  });

  test('Should create top terms and top terms percentage fields', () => {
    const fields = esAggFieldsFactory(
      { type: AGG_TYPE.TERMS, field: 'myField' },
      mockEsAggSource,
      FIELD_ORIGIN.SOURCE
    );
    expect(fields.length).toBe(2);
  });
});

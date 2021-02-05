/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFilter } from './find_rules';
import { SIGNALS_ID } from '../../../../common/constants';

describe('find_rules', () => {
  test('it returns a full filter with an AND if sent down', () => {
    expect(getFilter('alert.attributes.enabled: true')).toEqual(
      `alert.attributes.alertTypeId: ${SIGNALS_ID} AND alert.attributes.enabled: true`
    );
  });

  test('it returns existing filter with no AND when not set', () => {
    expect(getFilter(null)).toEqual(`alert.attributes.alertTypeId: ${SIGNALS_ID}`);
  });
});

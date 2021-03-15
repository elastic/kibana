/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { numberToDuration } from './schema_utils';

describe('Schema Utils', () => {
  it('numberToDuration converts a number/Duration into a Duration object', () => {
    expect(numberToDuration(500)).toMatchInlineSnapshot(`"PT0.5S"`);
    expect(numberToDuration(moment.duration(1, 'hour'))).toMatchInlineSnapshot(`"PT1H"`);
  });
});

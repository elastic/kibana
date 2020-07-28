/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setSignalStatusValidateTypeDependents } from './set_signal_status_type_dependents';
import { SetSignalsStatusSchema } from './set_signal_status_schema';

describe('update_rules_type_dependents', () => {
  test('You can have just a "signals_id"', () => {
    const schema: SetSignalsStatusSchema = {
      status: 'open',
      signal_ids: ['some-id'],
    };
    const errors = setSignalStatusValidateTypeDependents(schema);
    expect(errors).toEqual([]);
  });

  test('You can have just a "query"', () => {
    const schema: SetSignalsStatusSchema = {
      status: 'open',
      query: {},
    };
    const errors = setSignalStatusValidateTypeDependents(schema);
    expect(errors).toEqual([]);
  });

  test('You cannot have both a "signals_id" and a "query"', () => {
    const schema: SetSignalsStatusSchema = {
      status: 'open',
      query: {},
      signal_ids: ['some-id'],
    };
    const errors = setSignalStatusValidateTypeDependents(schema);
    expect(errors).toEqual(['both "signal_ids" and "query" cannot exist, choose one or the other']);
  });

  test('You must set either an "signals_id" and a "query"', () => {
    const schema: SetSignalsStatusSchema = {
      status: 'open',
    };
    const errors = setSignalStatusValidateTypeDependents(schema);
    expect(errors).toEqual(['either "signal_ids" or "query" must be set']);
  });
});

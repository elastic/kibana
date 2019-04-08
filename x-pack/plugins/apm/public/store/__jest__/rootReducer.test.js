/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { rootReducer } from '../rootReducer';

const ISO_DATE_PATTERN = /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/;

describe('root reducer', () => {
  it('should return the initial state', () => {
    const state = rootReducer(undefined, {});

    expect(state.urlParams.start).toMatch(ISO_DATE_PATTERN);
    expect(state.urlParams.end).toMatch(ISO_DATE_PATTERN);

    delete state.urlParams.start;
    delete state.urlParams.end;

    expect(state).toEqual({
      location: { hash: '', pathname: '', search: '' },
      reactReduxRequest: {},
      urlParams: {}
    });
  });
});

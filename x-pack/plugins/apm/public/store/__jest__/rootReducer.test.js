/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { rootReducer } from '../rootReducer';

describe('root reducer', () => {
  it('should return the initial state', () => {
    expect(rootReducer(undefined, {})).toEqual({
      location: { hash: '', pathname: '', search: '' },
      reactReduxRequest: {},
      urlParams: {}
    });
  });
});

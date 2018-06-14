/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import reducer from '../rootReducer';

describe('root reducer', () => {
  it('should return the initial state', () => {
    expect(reducer(undefined, {})).toEqual({
      location: { hash: '', pathname: '', search: '' },
      reactReduxRequest: {},
      sorting: {
        service: { descending: false, key: 'serviceName' },
        transaction: { descending: true, key: 'impact' }
      },
      urlParams: {}
    });
  });
});

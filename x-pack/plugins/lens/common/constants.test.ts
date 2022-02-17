/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEditPath } from './constants';

describe('getEditPath', function () {
  it('should return value when no time range', function () {
    expect(getEditPath(undefined)).toEqual('#/edit_by_value');
  });

  it('should return value when no time range but id is given', function () {
    expect(getEditPath('1234354')).toEqual('#/edit/1234354');
  });

  it('should return value when time range is given', function () {
    expect(getEditPath(undefined, { from: 'now-15m', to: 'now' })).toEqual(
      '#/edit_by_value?_g=(time:(from:now-15m,to:now))'
    );
  });

  it('should return value when time range and id is given', function () {
    expect(getEditPath('12345', { from: 'now-15m', to: 'now' })).toEqual(
      '#/edit/12345?_g=(time:(from:now-15m,to:now))'
    );
  });
});

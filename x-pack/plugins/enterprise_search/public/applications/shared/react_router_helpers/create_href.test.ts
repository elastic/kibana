/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockHistory } from '../../__mocks__';

import { createHref } from './';

describe('createHref', () => {
  it('generates a path with the React Router basename included', () => {
    expect(createHref('/test', mockHistory)).toEqual('/app/enterprise_search/test');
  });

  it('does not include the basename if shouldNotCreateHref is passed', () => {
    expect(createHref('/test', mockHistory, { shouldNotCreateHref: true })).toEqual('/test');
  });
});

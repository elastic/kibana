/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { stripTrailingSlash } from './';

describe('Strip Trailing Slash helper', () => {
  it('strips trailing slashes', async () => {
    expect(stripTrailingSlash('http://trailing.slash/')).toEqual('http://trailing.slash');
  });

  it('does nothing is there is no trailing slash', async () => {
    expect(stripTrailingSlash('http://ok.url')).toEqual('http://ok.url');
  });
});

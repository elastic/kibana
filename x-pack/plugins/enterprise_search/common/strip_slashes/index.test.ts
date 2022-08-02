/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stripTrailingSlash, stripLeadingSlash } from '.';

describe('Strip Trailing Slash helper', () => {
  it('strips trailing slashes', () => {
    expect(stripTrailingSlash('http://trailing.slash/')).toEqual('http://trailing.slash');
  });

  it('does nothing if there is no trailing slash', () => {
    expect(stripTrailingSlash('http://ok.url')).toEqual('http://ok.url');
  });
});

describe('Strip Leading Slash helper', () => {
  it('strips leading slashes', () => {
    expect(stripLeadingSlash('/some/long/path/')).toEqual('some/long/path/');
  });

  it('does nothing if there is no trailing slash', () => {
    expect(stripLeadingSlash('ok')).toEqual('ok');
  });
});

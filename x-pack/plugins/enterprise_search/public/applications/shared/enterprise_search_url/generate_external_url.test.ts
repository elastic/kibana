/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExternalUrl } from './';

describe('Enterprise Search external URL helper', () => {
  const externalUrl = new ExternalUrl('http://localhost:3002');

  it('exposes a public enterpriseSearchUrl string', () => {
    expect(externalUrl.enterpriseSearchUrl).toEqual('http://localhost:3002');
  });

  it('generates a public App Search URL', () => {
    expect(externalUrl.getAppSearchUrl()).toEqual('http://localhost:3002/as');
    expect(externalUrl.getAppSearchUrl('/path')).toEqual('http://localhost:3002/as/path');
  });

  it('generates a public Workplace Search URL', () => {
    expect(externalUrl.getWorkplaceSearchUrl()).toEqual('http://localhost:3002/ws');
    expect(externalUrl.getWorkplaceSearchUrl('/path')).toEqual('http://localhost:3002/ws/path');
  });
});

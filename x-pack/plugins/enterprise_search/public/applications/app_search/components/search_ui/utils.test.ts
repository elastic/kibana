/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/enterprise_search_url.mock';

import { generatePreviewUrl } from './utils';

jest.mock('../engine', () => ({
  EngineLogic: {
    values: {
      engineName: 'national-parks-demo',
    },
  },
}));

describe('generatePreviewUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates a url to the preview application from state', () => {
    expect(
      generatePreviewUrl({
        titleField: 'foo',
        urlField: 'bar',
        facets: ['baz', 'qux'],
        sortFields: ['quux', 'quuz'],
        empty: '', // Empty fields should be stripped
        empty2: [''], // Empty fields should be stripped
      })
    ).toEqual(
      'http://localhost:3002/as/engines/national-parks-demo/reference_application/preview?facets[]=baz&facets[]=qux&sortFields[]=quux&sortFields[]=quuz&titleField=foo&urlField=bar'
    );
  });
});

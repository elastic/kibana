/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CUSTOMER0_CUSTOM_CONTEXT, getDatasetCustomContext } from './custom_context';

describe('getDatasetCustomContext', () => {
  it('gives customer0-tagged datasets the customer0 context whatever their name', () => {
    expect(
      getDatasetCustomContext({ name: 'ns-investigation-golden-1910', tags: ['customer0'] })
    ).toBe(CUSTOMER0_CUSTOM_CONTEXT);
  });

  it('still recognizes untagged datasets by the nightshift/customer0 name prefix', () => {
    expect(getDatasetCustomContext({ name: 'nightshift/customer0-manual-v2' })).toBe(
      CUSTOMER0_CUSTOM_CONTEXT
    );
  });

  it('gives other datasets no custom context', () => {
    expect(getDatasetCustomContext({ name: 'nightshift/orca-ech-full', tags: ['orca'] })).toEqual(
      []
    );
  });
});

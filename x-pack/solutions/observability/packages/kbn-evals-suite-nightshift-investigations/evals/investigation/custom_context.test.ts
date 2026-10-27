/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CUSTOMER0_CUSTOM_CONTEXT, getDatasetCustomContext } from './custom_context';

describe('getDatasetCustomContext', () => {
  it('applies the customer0 context to customer0 example files', () => {
    expect(getDatasetCustomContext({ name: 'nightshift/customer0/incidents' })).toBe(
      CUSTOMER0_CUSTOM_CONTEXT
    );
  });

  it('applies the customer0 context to stored datasets tagged customer0', () => {
    expect(
      getDatasetCustomContext({
        name: 'ns-investigation-golden-2610',
        tags: ['nightshift', 'customer0', 'golden'],
      })
    ).toBe(CUSTOMER0_CUSTOM_CONTEXT);
  });

  it('applies no context to other datasets', () => {
    expect(getDatasetCustomContext({ name: 'nightshift/synthetic', tags: ['nightshift'] })).toEqual(
      []
    );
    expect(getDatasetCustomContext({ name: 'ns-investigation-golden-2610' })).toEqual([]);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getProductAppFeatures } from './pli_features';
import * as pliConfig from './pli_config';

describe('getProductAppFeatures', () => {
  it('returns the union of all enabled PLIs features', () => {
    // @ts-ignore reassigning readonly value for testing
    pliConfig.PLI_APP_FEATURES = {
      endpointEssentials: {
        foo: true,
        bar: false,
      },
      cloudEssentials: {
        baz: true,
        qux: false,
      },
    };

    expect(getProductAppFeatures(['endpointEssentials', 'cloudEssentials'])).toEqual({
      foo: true,
      baz: true,
    });
  });

  it('returns a single PLI when only one is enabled', () => {
    // @ts-ignore reassigning readonly value for testing
    pliConfig.PLI_APP_FEATURES = {
      endpointEssentials: {
        foo: false,
      },
      cloudEssentials: {
        foo: true,
      },
    };
    expect(getProductAppFeatures(['endpointEssentials', 'cloudEssentials'])).toEqual({
      foo: true,
    });
  });

  it('returns an empty object if no PLIs are enabled', () => {
    expect(getProductAppFeatures([])).toEqual({});
  });
});

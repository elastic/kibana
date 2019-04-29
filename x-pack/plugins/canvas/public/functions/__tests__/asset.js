/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { functionWrapper } from '../../../__tests__/helpers/function_wrapper';
import { asset } from '../asset';

// TODO: restore this test
// will require the ability to mock the store, or somehow remove the function's dependency on getState
describe.skip('asset', () => {
  const fn = functionWrapper(asset);

  it('throws if asset could not be retrieved by ID', () => {
    const throwsErr = () => {
      return fn(null, { id: 'boo' });
    };
    expect(throwsErr).to.throwException(err => {
      expect(err.message).to.be('Could not get the asset by ID: boo');
    });
  });

  it('returns the asset for found asset ID', () => {
    expect(fn(null, { id: 'yay' })).to.be('here is your image');
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { Arg } from '../arg';

describe('Arg', () => {
  it('sets required to false by default', () => {
    const isOptional = new Arg({
      name: 'optional_me',
    });
    expect(isOptional.required).to.equal(false);

    const isRequired = new Arg({
      name: 'require_me',
      required: true,
    });
    expect(isRequired.required).to.equal(true);
  });
});

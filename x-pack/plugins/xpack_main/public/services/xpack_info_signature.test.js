/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { xpackInfoSignature, XPACK_INFO_SIG_KEY } from './xpack_info_signature';

describe('xpack_info_signature service', () => {
  it ('updates the stored xpack info signature', () => {
    const updatedXPackInfoSignature = 'foobar';
    xpackInfoSignature.set(updatedXPackInfoSignature);
    expect(sessionStorage.__STORE__[XPACK_INFO_SIG_KEY]).to.be(updatedXPackInfoSignature);
    expect(xpackInfoSignature.get()).to.be(updatedXPackInfoSignature);
  });

  it ('clears the stored xpack info signature', () => {
    const updatedXPackInfoSignature = 'foobar';
    xpackInfoSignature.set(updatedXPackInfoSignature);
    expect(xpackInfoSignature.get()).not.to.be(undefined);

    xpackInfoSignature.clear();
    expect(sessionStorage.length).to.be(0);
    expect(xpackInfoSignature.get()).to.be(null);
  });
});

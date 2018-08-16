/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { xpackInfo, XPACK_INFO_KEY } from './xpack_info';

describe('xpack_info service', () => {
  it ('updates the stored xpack info', () => {
    const updatedXPackInfo = {
      foo: {
        bar: 17
      }
    };
    xpackInfo.setAll(updatedXPackInfo);
    expect(sessionStorage.__STORE__[XPACK_INFO_KEY]).to.be(JSON.stringify(updatedXPackInfo));
    expect(xpackInfo.get('foo.bar')).to.be(17);
  });

  it ('clears the stored xpack info', () => {
    const updatedXPackInfo = {
      foo: {
        bar: 17
      }
    };
    xpackInfo.setAll(updatedXPackInfo);
    expect(xpackInfo.get('foo.bar')).not.to.be(undefined);

    xpackInfo.clear();
    expect(sessionStorage.length).to.be(0);
    expect(xpackInfo.get('foo.bar')).to.be(undefined);
  });

  it ('defaults to the provided default value if the requested path is not found', () => {
    xpackInfo.setAll({ foo: 'bar' });
    expect(xpackInfo.get('foo.baz', 17)).to.be(17);
  });
});

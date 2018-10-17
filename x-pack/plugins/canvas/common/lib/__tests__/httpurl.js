/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { isValid } from '../httpurl';

describe('httpurl.isValid', () => {
  it('matches HTTP URLs', () => {
    expect(isValid('http://server.com/veggie/hamburger.jpg')).to.be(true);
    expect(isValid('https://server.com:4443/veggie/hamburger.jpg')).to.be(true);
    expect(isValid('http://user:password@server.com:4443/veggie/hamburger.jpg')).to.be(true);
    expect(isValid('http://virtual-machine/veggiehamburger.jpg')).to.be(true);
    expect(isValid('https://virtual-machine:44330/veggie.jpg?hamburger')).to.be(true);
    expect(isValid('http://192.168.1.50/veggie/hamburger.jpg')).to.be(true);
    expect(isValid('https://2600::/veggie/hamburger.jpg')).to.be(true); // ipv6
    expect(isValid('http://2001:4860:4860::8844/veggie/hamburger.jpg')).to.be(true); // ipv6
  });
  it('rejects non-HTTP URLs', () => {
    expect(isValid('')).to.be(false);
    expect(isValid('http://server.com')).to.be(false);
    expect(isValid('file:///Users/programmer/Pictures/hamburger.jpeg')).to.be(false);
    expect(isValid('ftp://hostz.com:1111/path/to/image.png')).to.be(false);
    expect(isValid('ftp://user:password@host:1111/path/to/image.png')).to.be(false);
    expect(
      isValid('data:image/gif;base64,R0lGODlhPQBEAPeoAJosM//AwO/AwHVYZ/z595kzAP/s7P+...')
    ).to.be(false);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { latestChange } from '../latest_change';

describe('latestChange', () => {
  it('returns a function', () => {
    const checker = latestChange();
    expect(checker).to.be.a('function');
  });

  it('returns null without args', () => {
    const checker = latestChange();
    expect(checker()).to.be(null);
  });

  describe('checker function', () => {
    let checker;

    beforeEach(() => {
      checker = latestChange(1, 2, 3);
    });

    it('returns null if nothing changed', () => {
      expect(checker(1, 2, 3)).to.be(null);
    });

    it('returns the latest value', () => {
      expect(checker(1, 4, 3)).to.equal(4);
    });

    it('returns the newst value every time', () => {
      expect(checker(1, 4, 3)).to.equal(4);
      expect(checker(10, 4, 3)).to.equal(10);
      expect(checker(10, 4, 30)).to.equal(30);
    });

    it('returns the previous value if nothing changed', () => {
      expect(checker(1, 4, 3)).to.equal(4);
      expect(checker(1, 4, 3)).to.equal(4);
    });

    it('returns only the first changed value', () => {
      expect(checker(2, 4, 3)).to.equal(2);
      expect(checker(2, 10, 11)).to.equal(10);
    });

    it('does not check new arguments', () => {
      // 4th arg is new, so nothing changed compared to the first state
      expect(checker(1, 2, 3, 4)).to.be(null);
      expect(checker(1, 2, 3, 5)).to.be(null);
      expect(checker(1, 2, 3, 6)).to.be(null);
    });

    it('returns changes with too many args', () => {
      expect(checker(20, 2, 3, 4)).to.equal(20);
      expect(checker(20, 2, 30, 5)).to.equal(30);
    });

    it('returns undefined values', () => {
      expect(checker(1, undefined, 3, 4)).to.be(undefined);
    });
  });
});

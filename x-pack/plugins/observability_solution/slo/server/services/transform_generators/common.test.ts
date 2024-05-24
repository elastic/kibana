/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTimesliceTargetComparator, parseIndex } from './common';

describe('common', () => {
  describe('parseIndex', () => {
    it.each([
      ['foo-*', 'foo-*'],
      ['foo-*,bar-*', ['foo-*', 'bar-*']],
      ['remote:foo-*', 'remote:foo-*'],
      ['remote:foo*,bar-*', ['remote:foo*', 'bar-*']],
      ['remote:foo*,remote:bar-*', ['remote:foo*', 'remote:bar-*']],
      ['remote:foo*,bar-*,remote:baz-*', ['remote:foo*', 'bar-*', 'remote:baz-*']],
    ])("parses the index '%s' correctly", (index, expected) => {
      expect(parseIndex(index)).toEqual(expected);
    });
  });

  describe('timeslice target comparator', () => {
    it('returns GT when timeslice target is 0', () => {
      expect(getTimesliceTargetComparator(0)).toBe('>');
    });

    it('returns GTE when timeslice tyarnarget is not 0', () => {
      expect(getTimesliceTargetComparator(0.000000001)).toBe('>=');
    });
  });
});

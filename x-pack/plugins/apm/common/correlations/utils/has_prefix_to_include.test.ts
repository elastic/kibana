/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FIELD_PREFIX_TO_ADD_AS_CANDIDATE } from '../constants';

import { hasPrefixToInclude } from './has_prefix_to_include';

describe('aggregation utils', () => {
  describe('hasPrefixToInclude', () => {
    it('returns true if the prefix is included', async () => {
      FIELD_PREFIX_TO_ADD_AS_CANDIDATE.forEach((prefix) => {
        expect(hasPrefixToInclude(`${prefix}the-field-name`)).toBe(true);
      });
    });
    it('returns false if the prefix is included', async () => {
      FIELD_PREFIX_TO_ADD_AS_CANDIDATE.forEach((prefix) => {
        expect(
          hasPrefixToInclude(`unknown-prefix-.${prefix}the-field-name`)
        ).toBe(false);
        expect(hasPrefixToInclude('the-field-name')).toBe(false);
      });
    });
  });
});

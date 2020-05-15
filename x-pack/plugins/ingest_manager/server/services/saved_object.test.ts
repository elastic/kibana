/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { escapeSearchQueryPhrase } from './saved_object';

describe('Saved object service', () => {
  describe('escapeSearchQueryPhrase', () => {
    it('should return value between quotes', () => {
      const res = escapeSearchQueryPhrase('-test');

      expect(res).toEqual('"-test"');
    });

    it('should escape quotes', () => {
      const res = escapeSearchQueryPhrase('test1"test2');

      expect(res).toEqual(`"test1\"test2"`);
    });
  });
});

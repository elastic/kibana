/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shouldfetchServer } from '.';

describe('ManagedTable', () => {
  describe('shouldfetchServer', () => {
    it('returns true if maxCountExceeded is true', () => {
      const result = shouldfetchServer({
        maxCountExceeded: true,
        newSearchQuery: 'apple',
        oldSearchQuery: 'banana',
      });
      expect(result).toBeTruthy();
    });

    it('returns true if newSearchQuery does not include oldSearchQuery', () => {
      const result = shouldfetchServer({
        maxCountExceeded: false,
        newSearchQuery: 'grape',
        oldSearchQuery: 'banana',
      });
      expect(result).toBeTruthy();
    });

    it('returns false if maxCountExceeded is false and newSearchQuery includes oldSearchQuery', () => {
      const result = shouldfetchServer({
        maxCountExceeded: false,
        newSearchQuery: 'banana',
        oldSearchQuery: 'ban',
      });
      expect(result).toBeFalsy();
    });

    it('returns true if maxCountExceeded is true even if newSearchQuery includes oldSearchQuery', () => {
      const result = shouldfetchServer({
        maxCountExceeded: true,
        newSearchQuery: 'banana',
        oldSearchQuery: 'ban',
      });
      expect(result).toBeTruthy();
    });

    it('returns true if maxCountExceeded is true and newSearchQuery is empty', () => {
      const result = shouldfetchServer({
        maxCountExceeded: true,
        newSearchQuery: '',
        oldSearchQuery: 'banana',
      });
      expect(result).toBeTruthy();
    });

    it('returns false if maxCountExceeded is false and both search queries are empty', () => {
      const result = shouldfetchServer({
        maxCountExceeded: false,
        newSearchQuery: '',
        oldSearchQuery: '',
      });
      expect(result).toBeFalsy();
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { navTabs } from '../../../app/home/home_navigations';
import { getTitle, isQueryStateEmpty } from './helpers';
import { CONSTANTS } from './constants';

describe('Helpers Url_State', () => {
  describe('getTitle', () => {
    test('host page name', () => {
      const result = getTitle('hosts', navTabs);
      expect(result).toEqual('Hosts');
    });
    test('network page name', () => {
      const result = getTitle('network', navTabs);
      expect(result).toEqual('Network');
    });
    test('overview page name', () => {
      const result = getTitle('overview', navTabs);
      expect(result).toEqual('Overview');
    });
    test('timelines page name', () => {
      const result = getTitle('timelines', navTabs);
      expect(result).toEqual('Timelines');
    });
    test('Not existing', () => {
      const result = getTitle('IamHereButNotReally', navTabs);
      expect(result).toEqual('');
    });
  });

  describe('isQueryStateEmpty', () => {
    test('returns true if queryState is undefined', () => {
      const result = isQueryStateEmpty(undefined, CONSTANTS.savedQuery);
      expect(result).toBeTruthy();
    });

    test('returns true if queryState is null', () => {
      const result = isQueryStateEmpty(null, CONSTANTS.savedQuery);
      expect(result).toBeTruthy();
    });

    test('returns true if url key is "query" and queryState is empty string', () => {
      const result = isQueryStateEmpty({}, CONSTANTS.appQuery);
      expect(result).toBeTruthy();
    });

    test('returns false if url key is "query" and queryState is not empty', () => {
      const result = isQueryStateEmpty(
        { query: { query: '*:*' }, language: 'kuery' },
        CONSTANTS.appQuery
      );
      expect(result).toBeFalsy();
    });

    test('returns true if url key is "filters" and queryState is empty', () => {
      const result = isQueryStateEmpty([], CONSTANTS.filters);
      expect(result).toBeTruthy();
    });

    test('returns false if url key is "filters" and queryState is not empty', () => {
      const result = isQueryStateEmpty(
        [{ query: { query: '*:*' }, meta: { key: '123' } }],
        CONSTANTS.filters
      );
      expect(result).toBeFalsy();
    });

    // TODO: Is this a bug, or intended?
    test('returns false if url key is "timeline" and queryState is empty', () => {
      const result = isQueryStateEmpty({}, CONSTANTS.timeline);
      expect(result).toBeFalsy();
    });

    test('returns true if url key is "timeline" and queryState id is empty string', () => {
      const result = isQueryStateEmpty({ id: '', isOpen: true }, CONSTANTS.timeline);
      expect(result).toBeTruthy();
    });

    test('returns false if url key is "timeline" and queryState is not empty', () => {
      const result = isQueryStateEmpty({ id: '123', isOpen: true }, CONSTANTS.timeline);
      expect(result).toBeFalsy();
    });
  });
});

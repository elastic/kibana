/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { navTabs } from '../../app/home/home_navigations';
import { getTitle } from './use_update_browser_title';

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
});

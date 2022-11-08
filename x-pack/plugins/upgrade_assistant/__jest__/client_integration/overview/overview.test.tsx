/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setupEnvironment } from '../helpers';
import { OverviewTestBed, setupOverviewPage } from './overview.helpers';

describe('Overview Page', () => {
  let testBed: OverviewTestBed;
  beforeEach(async () => {
    testBed = await setupOverviewPage(setupEnvironment().httpSetup);
    testBed.component.update();
  });

  describe('Documentation links', () => {
    test('Has a whatsNew link and it references target version', () => {
      const { exists, find } = testBed;

      expect(exists('whatsNewLink')).toBe(true);
      expect(find('whatsNewLink').text()).toContain('8');
    });

    test('Has a link for upgrade assistant in page header', () => {
      const { exists } = testBed;

      expect(exists('documentationLink')).toBe(true);
    });
  });
});

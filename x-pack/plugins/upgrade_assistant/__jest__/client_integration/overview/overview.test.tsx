/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OverviewTestBed, setupOverviewPage, setupEnvironment, kibanaVersion } from '../helpers';

describe('Overview Page', () => {
  let testBed: OverviewTestBed;
  const { server } = setupEnvironment();

  beforeEach(async () => {
    testBed = await setupOverviewPage();
    testBed.component.update();
  });

  afterAll(() => {
    server.restore();
  });

  describe('Documentation links', () => {
    test('Has a whatsNew link and it references nextMajor version', () => {
      const { exists, find } = testBed;
      const nextMajor = kibanaVersion.major + 1;

      expect(exists('whatsNewLink')).toBe(true);
      expect(find('whatsNewLink').text()).toContain(`${nextMajor}.0`);
    });

    test('Has a link for upgrade assistant in page header', () => {
      const { exists } = testBed;

      expect(exists('documentationLink')).toBe(true);
    });
  });
});

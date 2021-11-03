/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { OverviewTestBed, setupOverviewPage, setupEnvironment } from '../../helpers';

describe('Overview - Upgrade Step', () => {
  let testBed: OverviewTestBed;
  const { server } = setupEnvironment();

  beforeEach(async () => {
    testBed = await setupOverviewPage();
    testBed.component.update();
  });

  afterAll(() => {
    server.restore();
  });

  describe('Step 3 - Upgrade stack', () => {
    test('Shows link to setup upgrade docs for on-prem installations', () => {
      const { exists } = testBed;

      expect(exists('upgradeSetupDocsLink')).toBe(true);
      expect(exists('upgradeSetupCloudLink')).toBe(false);
    });

    test('Shows upgrade cta and link to docs for cloud installations', async () => {
      await act(async () => {
        testBed = await setupOverviewPage({
          servicesOverrides: {
            cloud: {
              isCloudEnabled: true,
              baseUrl: 'https://test.com',
              cloudId: '1234',
            },
          },
        });
      });

      const { component, exists, find } = testBed;
      component.update();

      expect(exists('upgradeSetupCloudLink')).toBe(true);
      expect(exists('upgradeSetupDocsLink')).toBe(true);

      expect(find('upgradeSetupCloudLink').props().href).toBe('https://test.com/deployments/1234');
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { setupEnvironment } from '../../helpers';
import { OverviewTestBed, setupOverviewPage } from '../overview.helpers';

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
          kibanaContextOverrides: {
            cloud: {
              isCloudEnabled: true,
              deploymentUrl:
                'https://cloud.elastic.co./deployments/bfdad4ef99a24212a06d387593686d63',
            },
          },
        });
      });

      const { component, exists, find } = testBed;
      component.update();

      expect(exists('upgradeSetupCloudLink')).toBe(true);
      expect(exists('upgradeSetupDocsLink')).toBe(true);

      expect(find('upgradeSetupCloudLink').props().href).toBe(
        'https://cloud.elastic.co./deployments/bfdad4ef99a24212a06d387593686d63'
      );
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { deprecationsServiceMock } from 'src/core/public/mocks';

import { setupEnvironment } from '../helpers';
import { KibanaTestBed, setupKibanaPage } from './kibana_deprecations.helpers';
import { kibanaDeprecationsMockResponse } from './mocked_responses';

describe('Kibana deprecation details flyout', () => {
  let testBed: KibanaTestBed;
  const { server } = setupEnvironment();
  const deprecationService = deprecationsServiceMock.createStartContract();

  afterAll(() => {
    server.restore();
  });

  beforeEach(async () => {
    await act(async () => {
      deprecationService.getAllDeprecations = jest
        .fn()
        .mockReturnValue(kibanaDeprecationsMockResponse);

      testBed = await setupKibanaPage({
        services: {
          core: {
            deprecations: deprecationService,
          },
        },
      });
    });

    testBed.component.update();
  });

  describe('Deprecation with manual steps', () => {
    test('renders flyout with manual steps only', async () => {
      const { find, exists, actions } = testBed;
      const manualDeprecation = kibanaDeprecationsMockResponse[1];

      await actions.table.clickDeprecationAt(1);

      expect(exists('kibanaDeprecationDetails')).toBe(true);
      expect(find('kibanaDeprecationDetails.flyoutTitle').text()).toBe(
        `'${manualDeprecation.domainId}' is using a deprecated feature`
      );
      expect(find('manualStepsList').find('li').length).toEqual(
        manualDeprecation.correctiveActions.manualSteps.length
      );
      expect(exists('resolveButton')).toBe(false);
      expect(exists('quickResolveCallout')).toBe(false);
    });
  });

  describe('Deprecation with automatic resolution', () => {
    test('resolves deprecation successfully', async () => {
      const { find, exists, actions } = testBed;
      const quickResolveDeprecation = kibanaDeprecationsMockResponse[0];

      deprecationService.resolveDeprecation = jest.fn().mockReturnValue({ status: 'ok' });

      await actions.table.clickDeprecationAt(0);

      expect(exists('kibanaDeprecationDetails')).toBe(true);
      expect(find('kibanaDeprecationDetails.flyoutTitle').text()).toBe(
        `'${quickResolveDeprecation.domainId}' is using a deprecated feature`
      );
      expect(exists('resolveSteps')).toBe(true);
      expect(exists('quickResolveCallout')).toBe(true);
      expect(exists('resolveButton')).toBe(true);

      await actions.flyout.clickResolveButton();

      expect(exists('kibanaDeprecationDetails')).toBe(false);

      // Reopen the flyout
      await actions.table.clickDeprecationAt(0);

      expect(exists('resolveSteps')).toBe(false);
      expect(find('resolveButton').props().disabled).toBe(true);
      expect(find('resolveButton').text()).toContain('Resolved');
    });

    test('handles resolve failure', async () => {
      const { find, exists, actions } = testBed;
      const quickResolveDeprecation = kibanaDeprecationsMockResponse[0];

      deprecationService.resolveDeprecation = jest
        .fn()
        .mockReturnValue({ status: 'fail', reason: 'resolve failed' });

      await actions.table.clickDeprecationAt(0);

      expect(exists('kibanaDeprecationDetails')).toBe(true);
      expect(find('kibanaDeprecationDetails.flyoutTitle').text()).toBe(
        `'${quickResolveDeprecation.domainId}' is using a deprecated feature`
      );
      expect(exists('resolveSteps')).toBe(true);
      expect(exists('quickResolveCallout')).toBe(true);
      expect(exists('resolveButton')).toBe(true);

      await actions.flyout.clickResolveButton();

      // Verify flyout closed
      expect(exists('kibanaDeprecationDetails')).toBe(false);

      // Reopen the flyout
      await actions.table.clickDeprecationAt(0);

      expect(exists('quickResolveError')).toBe(true);
      expect(exists('resolveSteps')).toBe(true);
      expect(find('resolveButton').props().disabled).toBe(false);
      expect(find('resolveButton').text()).toContain('Try again');
    });
  });
});

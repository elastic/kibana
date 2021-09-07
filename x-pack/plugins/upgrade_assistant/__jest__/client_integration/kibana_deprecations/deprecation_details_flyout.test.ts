/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { deprecationsServiceMock } from 'src/core/public/mocks';

import { setupEnvironment, kibanaDeprecationsServiceHelpers } from '../helpers';
import { KibanaTestBed, setupKibanaPage } from './kibana_deprecations.helpers';

describe('Kibana deprecation details flyout', () => {
  let testBed: KibanaTestBed;
  const { server } = setupEnvironment();
  const {
    defaultMockedResponses: { mockedKibanaDeprecations },
  } = kibanaDeprecationsServiceHelpers;
  const deprecationService = deprecationsServiceMock.createStartContract();

  afterAll(() => {
    server.restore();
  });

  beforeEach(async () => {
    await act(async () => {
      kibanaDeprecationsServiceHelpers.setLoadDeprecations({ deprecationService });

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
      const manualDeprecation = mockedKibanaDeprecations[1];

      await actions.table.clickDeprecationAt(1);

      expect(exists('kibanaDeprecationDetails')).toBe(true);
      expect(find('kibanaDeprecationDetails.flyoutTitle').text()).toBe(manualDeprecation.title);
      expect(find('manualStepsList').find('li').length).toEqual(
        manualDeprecation.correctiveActions.manualSteps.length
      );

      // Quick resolve callout and button should not display
      expect(exists('quickResolveCallout')).toBe(false);
      expect(exists('resolveButton')).toBe(false);
    });
  });

  describe('Deprecation with automatic resolution', () => {
    test('resolves deprecation successfully', async () => {
      const { find, exists, actions } = testBed;
      const quickResolveDeprecation = mockedKibanaDeprecations[0];

      await actions.table.clickDeprecationAt(0);

      expect(exists('kibanaDeprecationDetails')).toBe(true);
      expect(find('kibanaDeprecationDetails.flyoutTitle').text()).toBe(
        quickResolveDeprecation.title
      );
      expect(find('manualStepsList').find('li').length).toEqual(
        quickResolveDeprecation.correctiveActions.manualSteps.length
      );

      // Quick resolve callout and button should display
      expect(exists('quickResolveCallout')).toBe(true);
      expect(exists('resolveButton')).toBe(true);

      await actions.flyout.clickResolveButton();

      // Flyout should close after button click
      expect(exists('kibanaDeprecationDetails')).toBe(false);

      // Reopen the flyout
      await actions.table.clickDeprecationAt(0);

      // Resolve information should not display and Quick resolve button should be disabled
      expect(exists('resolveSection')).toBe(false);
      expect(find('resolveButton').props().disabled).toBe(true);
      expect(find('resolveButton').text()).toContain('Resolved');
    });

    test('handles resolve failure', async () => {
      const { find, exists, actions } = testBed;
      const quickResolveDeprecation = mockedKibanaDeprecations[0];

      kibanaDeprecationsServiceHelpers.setResolveDeprecations({
        deprecationService,
        status: 'fail',
      });

      await actions.table.clickDeprecationAt(0);

      expect(exists('kibanaDeprecationDetails')).toBe(true);
      expect(find('kibanaDeprecationDetails.flyoutTitle').text()).toBe(
        quickResolveDeprecation.title
      );

      // Quick resolve callout and button should display
      expect(exists('quickResolveCallout')).toBe(true);
      expect(exists('resolveButton')).toBe(true);

      await actions.flyout.clickResolveButton();

      // Flyout should close after button click
      expect(exists('kibanaDeprecationDetails')).toBe(false);

      // Reopen the flyout
      await actions.table.clickDeprecationAt(0);

      // Verify error displays
      expect(exists('quickResolveError')).toBe(true);
      // Resolve information should display and Quick resolve button should be enabled
      expect(exists('resolveSection')).toBe(true);
      expect(find('resolveButton').props().disabled).toBe(false);
      expect(find('resolveButton').text()).toContain('Try again');
    });
  });
});

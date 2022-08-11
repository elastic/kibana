/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { deprecationsServiceMock } from '@kbn/core/public/mocks';

import { setupEnvironment } from '../../helpers';
import { kibanaDeprecationsServiceHelpers } from '../service.mock';
import { KibanaTestBed, setupKibanaPage } from '../kibana_deprecations.helpers';

describe('Kibana deprecations - Deprecation details flyout', () => {
  let testBed: KibanaTestBed;
  const {
    defaultMockedResponses: { mockedKibanaDeprecations },
  } = kibanaDeprecationsServiceHelpers;
  const deprecationService = deprecationsServiceMock.createStartContract();
  beforeEach(async () => {
    await act(async () => {
      kibanaDeprecationsServiceHelpers.setLoadDeprecations({ deprecationService });

      testBed = await setupKibanaPage(setupEnvironment().httpSetup, {
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
    test('renders flyout with single manual step as a standalone paragraph', async () => {
      const { find, exists, actions } = testBed;
      const manualDeprecation = mockedKibanaDeprecations[1];

      await actions.table.clickDeprecationAt(0);

      expect(exists('kibanaDeprecationDetails')).toBe(true);
      expect(find('kibanaDeprecationDetails.flyoutTitle').text()).toBe(manualDeprecation.title);
      expect(find('manualStep').length).toBe(1);
    });

    test('renders flyout with multiple manual steps as a list', async () => {
      const { find, exists, actions } = testBed;
      const manualDeprecation = mockedKibanaDeprecations[1];

      await actions.table.clickDeprecationAt(1);

      expect(exists('kibanaDeprecationDetails')).toBe(true);
      expect(find('kibanaDeprecationDetails.flyoutTitle').text()).toBe(manualDeprecation.title);
      expect(find('manualStepsListItem').length).toBe(3);
    });

    test(`doesn't show corrective actions title and steps if there aren't any`, async () => {
      const { find, exists, actions } = testBed;
      const manualDeprecation = mockedKibanaDeprecations[2];

      await actions.table.clickDeprecationAt(2);

      expect(exists('kibanaDeprecationDetails')).toBe(true);
      expect(exists('kibanaDeprecationDetails.manualStepsTitle')).toBe(false);
      expect(exists('manualStepsListItem')).toBe(false);
      expect(find('kibanaDeprecationDetails.flyoutTitle').text()).toBe(manualDeprecation.title);
    });
  });

  test('Shows documentationUrl when present', async () => {
    const { find, actions } = testBed;
    const deprecation = mockedKibanaDeprecations[1];

    await actions.table.clickDeprecationAt(1);

    expect(find('kibanaDeprecationDetails.documentationLink').props().href).toBe(
      deprecation.documentationUrl
    );
  });

  describe('Deprecation with automatic resolution', () => {
    test('resolves deprecation successfully', async () => {
      const { find, exists, actions } = testBed;
      const quickResolveDeprecation = mockedKibanaDeprecations[0];

      await actions.table.clickDeprecationAt(0);

      expect(exists('kibanaDeprecationDetails')).toBe(true);
      expect(exists('kibanaDeprecationDetails.criticalDeprecationBadge')).toBe(true);
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

      // Resolve information should not display and Quick resolve button should be disabled
      expect(exists('resolveSection')).toBe(false);
      expect(exists('resolveButton')).toBe(false);
      // Badge should be updated in flyout title
      expect(exists('kibanaDeprecationDetails.resolvedDeprecationBadge')).toBe(true);
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
      expect(exists('kibanaDeprecationDetails.criticalDeprecationBadge')).toBe(true);
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
      // Badge should remain the same
      expect(exists('kibanaDeprecationDetails.criticalDeprecationBadge')).toBe(true);
      expect(find('resolveButton').props().disabled).toBe(false);
      expect(find('resolveButton').text()).toContain('Try again');
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DomainDeprecationDetails } from 'kibana/public';
import { act } from 'react-dom/test-utils';
import { deprecationsServiceMock } from 'src/core/public/mocks';

import { KibanaTestBed, setupKibanaPage, setupEnvironment } from './helpers';

describe('Kibana deprecations', () => {
  let testBed: KibanaTestBed;
  const { server } = setupEnvironment();

  afterAll(() => {
    server.restore();
  });

  describe('With deprecations', () => {
    const kibanaDeprecationsMockResponse: DomainDeprecationDetails[] = [
      {
        title: 'mock-deprecation-title',
        correctiveActions: {
          manualSteps: ['Step 1', 'Step 2', 'Step 3'],
          api: {
            method: 'POST',
            path: '/test',
          },
        },
        domainId: 'test_domain',
        level: 'critical',
        message: 'Test deprecation message',
      },
    ];

    beforeEach(async () => {
      await act(async () => {
        const deprecationService = deprecationsServiceMock.createStartContract();
        deprecationService.getAllDeprecations = jest
          .fn()
          .mockReturnValue(kibanaDeprecationsMockResponse);

        testBed = await setupKibanaPage({
          deprecations: deprecationService,
        });
      });

      testBed.component.update();
    });

    test('renders deprecations', () => {
      const { exists, find } = testBed;
      expect(exists('kibanaDeprecationsContent')).toBe(true);
      expect(find('kibanaDeprecationItem').length).toEqual(1);
    });

    describe('manual steps modal', () => {
      test('renders modal with a list of steps to fix a deprecation', async () => {
        const { component, actions, exists, find } = testBed;
        const deprecation = kibanaDeprecationsMockResponse[0];

        expect(exists('kibanaDeprecationsContent')).toBe(true);

        // Open all deprecations
        actions.clickExpandAll();

        const accordionTestSubj = `${deprecation.domainId}Deprecation`;

        await act(async () => {
          find(`${accordionTestSubj}.stepsButton`).simulate('click');
        });

        component.update();

        // We need to read the document "body" as the modal is added there and not inside
        // the component DOM tree.
        let modal = document.body.querySelector('[data-test-subj="stepsModal"]');

        expect(modal).not.toBeNull();
        expect(modal!.textContent).toContain(`Resolve deprecation in '${deprecation.domainId}'`);

        const steps: NodeListOf<Element> | null = modal!.querySelectorAll(
          '[data-test-subj="fixDeprecationSteps"] .euiStep'
        );

        expect(steps).not.toBe(null);
        expect(steps.length).toEqual(deprecation!.correctiveActions!.manualSteps!.length);

        await act(async () => {
          const closeButton: HTMLButtonElement | null = modal!.querySelector(
            '[data-test-subj="closeButton"]'
          );

          closeButton!.click();
        });

        component.update();

        // Confirm modal closed and no longer appears in the DOM
        modal = document.body.querySelector('[data-test-subj="stepsModal"]');
        expect(modal).toBe(null);
      });
    });

    describe('resolve modal', () => {
      test('renders confirmation modal to resolve a deprecation', async () => {
        const { component, actions, exists, find } = testBed;
        const deprecation = kibanaDeprecationsMockResponse[0];

        expect(exists('kibanaDeprecationsContent')).toBe(true);

        // Open all deprecations
        actions.clickExpandAll();

        const accordionTestSubj = `${deprecation.domainId}Deprecation`;

        await act(async () => {
          find(`${accordionTestSubj}.resolveButton`).simulate('click');
        });

        component.update();

        // We need to read the document "body" as the modal is added there and not inside
        // the component DOM tree.
        let modal = document.body.querySelector('[data-test-subj="resolveModal"]');

        expect(modal).not.toBe(null);
        expect(modal!.textContent).toContain(`Resolve deprecation in '${deprecation.domainId}'`);

        const confirmButton: HTMLButtonElement | null = modal!.querySelector(
          '[data-test-subj="confirmModalConfirmButton"]'
        );

        await act(async () => {
          confirmButton!.click();
        });

        component.update();

        // Confirm modal should close and no longer appears in the DOM
        modal = document.body.querySelector('[data-test-subj="resolveModal"]');
        expect(modal).toBe(null);
      });
    });
  });

  describe('No deprecations', () => {
    beforeEach(async () => {
      await act(async () => {
        testBed = await setupKibanaPage({ isReadOnlyMode: false });
      });

      const { component } = testBed;

      component.update();
    });

    test('renders prompt', () => {
      const { exists, find } = testBed;
      expect(exists('noDeprecationsPrompt')).toBe(true);
      expect(find('noDeprecationsPrompt').text()).toContain(
        'Your Kibana configuration is up to date'
      );
    });
  });

  describe('Error handling', () => {
    test('handles request error', async () => {
      await act(async () => {
        const deprecationService = deprecationsServiceMock.createStartContract();
        deprecationService.getAllDeprecations = jest
          .fn()
          .mockRejectedValue(new Error('Internal Server Error'));

        testBed = await setupKibanaPage({
          deprecations: deprecationService,
        });
      });

      const { component, exists, find } = testBed;

      component.update();

      expect(exists('kibanaRequestError')).toBe(true);
      expect(find('kibanaRequestError').text()).toContain('Could not retrieve Kibana deprecations');
    });

    test('handles deprecation service error', async () => {
      const domainId = 'test';
      const kibanaDeprecationsMockResponse: DomainDeprecationDetails[] = [
        {
          domainId,
          title: `Failed to fetch deprecations for ${domainId}`,
          message: `Failed to get deprecations info for plugin "${domainId}".`,
          level: 'fetch_error',
          correctiveActions: {
            manualSteps: ['Check Kibana server logs for error message.'],
          },
        },
      ];

      await act(async () => {
        const deprecationService = deprecationsServiceMock.createStartContract();
        deprecationService.getAllDeprecations = jest
          .fn()
          .mockReturnValue(kibanaDeprecationsMockResponse);

        testBed = await setupKibanaPage({
          deprecations: deprecationService,
        });
      });

      const { component, exists, find, actions } = testBed;
      component.update();

      // Verify top-level callout renders
      expect(exists('kibanaPluginError')).toBe(true);
      expect(find('kibanaPluginError').text()).toContain(
        'Not all Kibana deprecations were retrieved successfully'
      );

      // Open all deprecations
      actions.clickExpandAll();

      // Verify callout also displays for deprecation with error
      expect(exists(`${domainId}Error`)).toBe(true);
    });
  });
});

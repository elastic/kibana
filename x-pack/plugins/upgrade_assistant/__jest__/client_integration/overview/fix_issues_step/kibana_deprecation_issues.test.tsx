/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { deprecationsServiceMock } from '@kbn/core/public/mocks';
import type { DomainDeprecationDetails } from '@kbn/core/public';

import { setupEnvironment } from '../../helpers';
import { kibanaDeprecationsServiceHelpers } from '../../kibana_deprecations/service.mock';
import { OverviewTestBed, setupOverviewPage } from '../overview.helpers';
import { esNoDeprecations } from './mock_es_issues';

describe('Overview - Fix deprecation issues step - Kibana deprecations', () => {
  let testBed: OverviewTestBed;
  const { mockedKibanaDeprecations, mockedCriticalKibanaDeprecations } =
    kibanaDeprecationsServiceHelpers.defaultMockedResponses;
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  beforeEach(async () => {
    const mockEnvironment = setupEnvironment();
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;
  });

  describe('When load succeeds', () => {
    const setup = async (response: DomainDeprecationDetails[]) => {
      // Set up with no ES deprecations.
      httpRequestsMockHelpers.setLoadEsDeprecationsResponse(esNoDeprecations);

      await act(async () => {
        const deprecationService = deprecationsServiceMock.createStartContract();
        kibanaDeprecationsServiceHelpers.setLoadDeprecations({ deprecationService, response });

        testBed = await setupOverviewPage(httpSetup, {
          services: {
            core: {
              deprecations: deprecationService,
            },
          },
        });
      });

      const { component } = testBed;
      component.update();
    };

    describe('when there are critical and warning issues', () => {
      beforeEach(async () => {
        await setup(mockedKibanaDeprecations);
      });

      test('renders counts for both', () => {
        const { exists, find } = testBed;

        expect(exists('kibanaStatsPanel')).toBe(true);
        expect(find('kibanaStatsPanel.criticalDeprecations').text()).toContain(1);
        expect(find('kibanaStatsPanel.warningDeprecations').text()).toContain(2);
      });

      test('panel links to Kibana deprecations page', () => {
        const { component, find } = testBed;
        component.update();
        expect(find('kibanaStatsPanel').find('a').props().href).toBe('/kibana_deprecations');
      });
    });

    describe('when there are critical but no warning issues', () => {
      beforeEach(async () => {
        await setup(mockedCriticalKibanaDeprecations);
      });

      test('renders a count for critical issues and success state for warning issues', () => {
        const { exists, find } = testBed;

        expect(exists('kibanaStatsPanel')).toBe(true);
        expect(find('kibanaStatsPanel.criticalDeprecations').text()).toContain(1);
        expect(exists('kibanaStatsPanel.noWarningDeprecationIssues')).toBe(true);
      });

      test('panel links to Kibana deprecations page', () => {
        const { component, find } = testBed;
        component.update();
        expect(find('kibanaStatsPanel').find('a').props().href).toBe('/kibana_deprecations');
      });
    });

    describe('when there no critical or warning issues', () => {
      beforeEach(async () => {
        await setup([]);
      });

      test('renders a success state for the panel', () => {
        const { exists } = testBed;
        expect(exists('kibanaStatsPanel')).toBe(true);
        expect(exists('kibanaStatsPanel.noDeprecationIssues')).toBe(true);
      });

      test(`panel doesn't link to Kibana deprecations page`, () => {
        const { component, find } = testBed;
        component.update();
        expect(find('kibanaStatsPanel').find('a').length).toBe(0);
      });
    });
  });

  describe(`When there's a load error`, () => {
    test('Handles network failure', async () => {
      await act(async () => {
        const deprecationService = deprecationsServiceMock.createStartContract();
        kibanaDeprecationsServiceHelpers.setLoadDeprecations({
          deprecationService,
          mockRequestErrorMessage: 'Internal Server Error',
        });

        testBed = await setupOverviewPage(httpSetup, {
          services: {
            core: {
              deprecations: deprecationService,
            },
          },
        });
      });

      const { component, find } = testBed;
      component.update();
      expect(find('loadingIssuesError').text()).toBe(
        'Could not retrieve Kibana deprecation issues.'
      );
    });
  });
});

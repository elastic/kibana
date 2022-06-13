/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { deprecationsServiceMock } from '@kbn/core/public/mocks';

import { setupEnvironment } from '../../helpers';
import { kibanaDeprecationsServiceHelpers } from '../../kibana_deprecations/service.mock';
import { OverviewTestBed, setupOverviewPage } from '../overview.helpers';
import {
  esCriticalAndWarningDeprecations,
  esCriticalOnlyDeprecations,
  esNoDeprecations,
} from './mock_es_issues';

describe('Overview - Fix deprecation issues step - Elasticsearch deprecations', () => {
  let testBed: OverviewTestBed;
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  beforeEach(async () => {
    const mockEnvironment = setupEnvironment();
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;
  });

  describe('When load succeeds', () => {
    const setup = async () => {
      // Set up with no Kibana deprecations.
      await act(async () => {
        const deprecationService = deprecationsServiceMock.createStartContract();
        kibanaDeprecationsServiceHelpers.setLoadDeprecations({ deprecationService, response: [] });

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
        httpRequestsMockHelpers.setLoadEsDeprecationsResponse(esCriticalAndWarningDeprecations);
        await setup();
      });

      test('renders counts for both', () => {
        const { exists, find } = testBed;
        expect(exists('esStatsPanel')).toBe(true);
        expect(find('esStatsPanel.warningDeprecations').text()).toContain('1');
        expect(find('esStatsPanel.criticalDeprecations').text()).toContain('1');
      });

      test('panel links to ES deprecations page', () => {
        const { component, find } = testBed;
        component.update();
        expect(find('esStatsPanel').find('a').props().href).toBe('/es_deprecations');
      });
    });

    describe('when there are critical but no warning issues', () => {
      beforeEach(async () => {
        httpRequestsMockHelpers.setLoadEsDeprecationsResponse(esCriticalOnlyDeprecations);
        await setup();
      });

      test('renders a count for critical issues and success state for warning issues', () => {
        const { exists, find } = testBed;
        expect(exists('esStatsPanel')).toBe(true);
        expect(find('esStatsPanel.criticalDeprecations').text()).toContain('1');
        expect(exists('esStatsPanel.noWarningDeprecationIssues')).toBe(true);
      });

      test('panel links to ES deprecations page', () => {
        const { component, find } = testBed;
        component.update();
        expect(find('esStatsPanel').find('a').props().href).toBe('/es_deprecations');
      });
    });

    describe('when there no critical or warning issues', () => {
      beforeEach(async () => {
        httpRequestsMockHelpers.setLoadEsDeprecationsResponse(esNoDeprecations);
        await setup();
      });

      test('renders a count for critical issues and success state for warning issues', () => {
        const { exists } = testBed;
        expect(exists('esStatsPanel')).toBe(true);
        expect(exists('esStatsPanel.noDeprecationIssues')).toBe(true);
      });

      test(`panel doesn't link to ES deprecations page`, () => {
        const { component, find } = testBed;
        component.update();
        expect(find('esStatsPanel').find('a').length).toBe(0);
      });
    });
  });

  describe(`When there's a load error`, () => {
    test('handles network failure', async () => {
      const error = {
        statusCode: 500,
        error: 'Internal server error',
        message: 'Internal server error',
      };

      httpRequestsMockHelpers.setLoadEsDeprecationsResponse(undefined, error);

      await act(async () => {
        testBed = await setupOverviewPage(httpSetup);
      });

      const { component, find } = testBed;
      component.update();
      expect(find('loadingIssuesError').text()).toBe(
        'Could not retrieve Elasticsearch deprecation issues.'
      );
    });

    test('handles unauthorized error', async () => {
      const error = {
        statusCode: 403,
        error: 'Forbidden',
        message: 'Forbidden',
      };

      httpRequestsMockHelpers.setLoadEsDeprecationsResponse(undefined, error);

      await act(async () => {
        testBed = await setupOverviewPage(httpSetup);
      });

      const { component, find } = testBed;
      component.update();
      expect(find('loadingIssuesError').text()).toBe(
        'You are not authorized to view Elasticsearch deprecation issues.'
      );
    });

    test('handles partially upgraded error', async () => {
      const error = {
        statusCode: 426,
        error: 'Upgrade required',
        message: 'There are some nodes running a different version of Elasticsearch',
        attributes: {
          allNodesUpgraded: false,
        },
      };

      httpRequestsMockHelpers.setLoadEsDeprecationsResponse(undefined, error);

      await act(async () => {
        testBed = await setupOverviewPage(httpSetup, { isReadOnlyMode: false });
      });

      const { component, find } = testBed;
      component.update();
      expect(find('loadingIssuesError').text()).toBe(
        'Upgrade Kibana to the same version as your Elasticsearch cluster. One or more nodes in the cluster is running a different version than Kibana.'
      );
    });

    test('handles upgrade error', async () => {
      const error = {
        statusCode: 426,
        error: 'Upgrade required',
        message: 'There are some nodes running a different version of Elasticsearch',
        attributes: {
          allNodesUpgraded: true,
        },
      };

      httpRequestsMockHelpers.setLoadEsDeprecationsResponse(undefined, error);

      await act(async () => {
        testBed = await setupOverviewPage(httpSetup, { isReadOnlyMode: false });
      });

      const { component, find } = testBed;
      component.update();
      expect(find('loadingIssuesError').text()).toBe('All Elasticsearch nodes have been upgraded.');
    });
  });
});

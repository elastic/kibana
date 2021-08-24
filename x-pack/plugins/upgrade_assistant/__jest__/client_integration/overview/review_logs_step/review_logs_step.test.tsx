/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { deprecationsServiceMock } from 'src/core/public/mocks';

import * as mockedResponses from './mocked_responses';
import { OverviewTestBed, setupOverviewPage, setupEnvironment } from '../../helpers';

describe('Overview - Fix deprecated settings step', () => {
  let testBed: OverviewTestBed;
  const { server, httpRequestsMockHelpers } = setupEnvironment();

  beforeEach(async () => {
    httpRequestsMockHelpers.setLoadEsDeprecationsResponse(mockedResponses.esDeprecations);

    await act(async () => {
      const deprecationService = deprecationsServiceMock.createStartContract();
      deprecationService.getAllDeprecations = jest
        .fn()
        .mockReturnValue(mockedResponses.kibanaDeprecations);

      testBed = await setupOverviewPage({
        deprecations: deprecationService,
      });
    });

    const { component } = testBed;
    component.update();
  });

  afterAll(() => {
    server.restore();
  });

  describe('ES deprecations', () => {
    test('Shows deprecation warning and critical counts', () => {
      const { exists, find } = testBed;

      expect(exists('esStatsPanel')).toBe(true);
      expect(find('esStatsPanel.warningDeprecations').text()).toContain('1');
      expect(find('esStatsPanel.criticalDeprecations').text()).toContain('1');
    });

    test('Handles network failure', async () => {
      const error = {
        statusCode: 500,
        error: 'Cant retrieve deprecations error',
        message: 'Cant retrieve deprecations error',
      };

      httpRequestsMockHelpers.setLoadEsDeprecationsResponse(undefined, error);

      await act(async () => {
        testBed = await setupOverviewPage();
      });

      const { component, exists } = testBed;

      component.update();

      expect(exists('esRequestErrorIconTip')).toBe(true);
    });

    test('Hides deprecation counts if it doesnt have any', async () => {
      httpRequestsMockHelpers.setLoadEsDeprecationsResponse(mockedResponses.esDeprecationsEmpty);

      await act(async () => {
        testBed = await setupOverviewPage();
      });

      const { exists } = testBed;

      expect(exists('noDeprecationsLabel')).toBe(true);
    });

    test('Stats panel navigates to deprecations list if clicked', () => {
      const { component, exists, find } = testBed;

      component.update();

      expect(exists('esStatsPanel')).toBe(true);
      expect(find('esStatsPanel').find('a').props().href).toBe('/es_deprecations');
    });

    describe('Renders ES errors', () => {
      test('handles network failure', async () => {
        const error = {
          statusCode: 500,
          error: 'Internal server error',
          message: 'Internal server error',
        };

        httpRequestsMockHelpers.setLoadEsDeprecationsResponse(undefined, error);

        await act(async () => {
          testBed = await setupOverviewPage();
        });

        const { component, exists } = testBed;

        component.update();

        expect(exists('esRequestErrorIconTip')).toBe(true);
      });

      test('handles unauthorized error', async () => {
        const error = {
          statusCode: 403,
          error: 'Forbidden',
          message: 'Forbidden',
        };

        httpRequestsMockHelpers.setLoadEsDeprecationsResponse(undefined, error);

        await act(async () => {
          testBed = await setupOverviewPage();
        });

        const { component, exists } = testBed;

        component.update();

        expect(exists('unauthorizedErrorIconTip')).toBe(true);
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
          testBed = await setupOverviewPage({ isReadOnlyMode: false });
        });

        const { component, exists } = testBed;

        component.update();

        expect(exists('partiallyUpgradedErrorIconTip')).toBe(true);
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
          testBed = await setupOverviewPage({ isReadOnlyMode: false });
        });

        const { component, exists } = testBed;

        component.update();

        expect(exists('upgradedErrorIconTip')).toBe(true);
      });
    });
  });

  describe('Kibana deprecations', () => {
    test('Show deprecation warning and critical counts', () => {
      const { exists, find } = testBed;

      expect(exists('kibanaStatsPanel')).toBe(true);
      expect(find('kibanaStatsPanel.warningDeprecations').text()).toContain('1');
      expect(find('kibanaStatsPanel.criticalDeprecations').text()).toContain('1');
    });

    test('Handles network failure', async () => {
      await act(async () => {
        const deprecationService = deprecationsServiceMock.createStartContract();
        deprecationService.getAllDeprecations = jest
          .fn()
          .mockRejectedValue(new Error('Internal Server Error'));

        testBed = await setupOverviewPage({
          deprecations: deprecationService,
        });
      });

      const { component, exists } = testBed;

      component.update();

      expect(exists('kibanaRequestErrorIconTip')).toBe(true);
    });

    test('Hides deprecation count if it doesnt have any', async () => {
      await act(async () => {
        const deprecationService = deprecationsServiceMock.createStartContract();
        deprecationService.getAllDeprecations = jest.fn().mockRejectedValue([]);

        testBed = await setupOverviewPage({
          deprecations: deprecationService,
        });
      });

      const { exists } = testBed;

      expect(exists('noDeprecationsLabel')).toBe(true);
      expect(exists('kibanaStatsPanel.warningDeprecations')).toBe(false);
      expect(exists('kibanaStatsPanel.criticalDeprecations')).toBe(false);
    });

    test('Stats panel navigates to deprecations list if clicked', () => {
      const { component, exists, find } = testBed;

      component.update();

      expect(exists('kibanaStatsPanel')).toBe(true);
      expect(find('kibanaStatsPanel').find('a').props().href).toBe('/kibana_deprecations');
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { deprecationsServiceMock } from '@kbn/core/public/mocks';
import type { DeprecationsServiceStart } from '@kbn/core/public';

import { setupEnvironment } from '../../helpers';
import { kibanaDeprecationsServiceHelpers } from '../service.mock';
import { KibanaTestBed, setupKibanaPage } from '../kibana_deprecations.helpers';

describe('Kibana deprecations - Deprecations table', () => {
  let testBed: KibanaTestBed;
  let deprecationService: jest.Mocked<DeprecationsServiceStart>;

  const {
    mockedKibanaDeprecations,
    mockedCriticalKibanaDeprecations,
    mockedWarningKibanaDeprecations,
    mockedConfigKibanaDeprecations,
  } = kibanaDeprecationsServiceHelpers.defaultMockedResponses;

  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  beforeEach(async () => {
    const mockEnvironment = setupEnvironment();
    httpSetup = mockEnvironment.httpSetup;
    deprecationService = deprecationsServiceMock.createStartContract();

    await act(async () => {
      kibanaDeprecationsServiceHelpers.setLoadDeprecations({ deprecationService });

      testBed = await setupKibanaPage(httpSetup, {
        services: {
          core: {
            deprecations: deprecationService,
          },
        },
      });
    });

    testBed.component.update();
  });

  test('renders deprecations', () => {
    const { exists, table } = testBed;

    expect(exists('kibanaDeprecations')).toBe(true);

    const { tableCellsValues } = table.getMetaData('kibanaDeprecationsTable');

    expect(tableCellsValues.length).toEqual(mockedKibanaDeprecations.length);
  });

  it('refreshes deprecation data', async () => {
    const { actions } = testBed;

    expect(deprecationService.getAllDeprecations).toHaveBeenCalledTimes(1);

    await actions.table.clickRefreshButton();

    expect(deprecationService.getAllDeprecations).toHaveBeenCalledTimes(2);
  });

  it('shows critical and warning deprecations count', () => {
    const { find } = testBed;

    expect(find('criticalDeprecationsCount').text()).toContain(
      mockedCriticalKibanaDeprecations.length
    );
    expect(find('warningDeprecationsCount').text()).toContain(
      mockedWarningKibanaDeprecations.length
    );
  });

  describe('Search bar', () => {
    it('filters by "critical" status', async () => {
      const { actions, table } = testBed;

      // Show only critical deprecations
      await actions.searchBar.clickCriticalFilterButton();
      const { rows: criticalRows } = table.getMetaData('kibanaDeprecationsTable');
      expect(criticalRows.length).toEqual(mockedCriticalKibanaDeprecations.length);

      // Show all deprecations
      await actions.searchBar.clickCriticalFilterButton();
      const { rows: allRows } = table.getMetaData('kibanaDeprecationsTable');
      expect(allRows.length).toEqual(mockedKibanaDeprecations.length);
    });

    it('filters by type', async () => {
      const { table, actions } = testBed;

      await actions.searchBar.openTypeFilterDropdown();
      await actions.searchBar.filterByConfigType();

      const { rows: configRows } = table.getMetaData('kibanaDeprecationsTable');

      expect(configRows.length).toEqual(mockedConfigKibanaDeprecations.length);
    });
  });

  describe('No deprecations', () => {
    beforeEach(async () => {
      await act(async () => {
        testBed = await setupKibanaPage(httpSetup, { isReadOnlyMode: false });
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
});

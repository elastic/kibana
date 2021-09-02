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

const criticalDeprecations = kibanaDeprecationsMockResponse.filter(
  (deprecation) => deprecation.level === 'critical'
);
const warningDeprecations = kibanaDeprecationsMockResponse.filter(
  (deprecation) => deprecation.level === 'warning'
);
const configDeprecations = kibanaDeprecationsMockResponse.filter(
  (deprecation) => deprecation.deprecationType === 'config'
);

describe('Kibana deprecations table', () => {
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

  test('renders deprecations', () => {
    const { exists, table } = testBed;

    expect(exists('kibanaDeprecations')).toBe(true);

    const { tableCellsValues } = table.getMetaData('kibanaDeprecationsTable');

    expect(tableCellsValues.length).toEqual(kibanaDeprecationsMockResponse.length);
  });

  it('refreshes deprecation data', async () => {
    const { actions } = testBed;

    expect(deprecationService.getAllDeprecations).toHaveBeenCalledTimes(1);

    await actions.table.clickRefreshButton();

    expect(deprecationService.getAllDeprecations).toHaveBeenCalledTimes(2);
  });

  it('shows critical and warning deprecations count', () => {
    const { find } = testBed;

    expect(find('criticalDeprecationsCount').text()).toContain(criticalDeprecations.length);
    expect(find('warningDeprecationsCount').text()).toContain(warningDeprecations.length);
  });

  describe('Search bar', () => {
    it('filters by "critical" status', async () => {
      const { actions, table } = testBed;

      // Show only critical deprecations
      await actions.searchBar.clickCriticalFilterButton();
      const { rows: criticalRows } = table.getMetaData('kibanaDeprecationsTable');
      expect(criticalRows.length).toEqual(criticalDeprecations.length);

      // Show all deprecations
      await actions.searchBar.clickCriticalFilterButton();
      const { rows: allRows } = table.getMetaData('kibanaDeprecationsTable');
      expect(allRows.length).toEqual(kibanaDeprecationsMockResponse.length);
    });

    it('filters by type', async () => {
      const { table, actions } = testBed;

      await actions.searchBar.openTypeFilterDropdown();
      await actions.searchBar.filterByConfigType();

      const { rows: configRows } = table.getMetaData('kibanaDeprecationsTable');

      expect(configRows.length).toEqual(configDeprecations.length);
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
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { deprecationsServiceMock } from 'src/core/public/mocks';

import type { DomainDeprecationDetails } from 'kibana/public';
import { setupEnvironment } from '../helpers';
import { KibanaTestBed, setupKibanaPage } from './kibana_deprecations.helpers';

const kibanaDeprecationsMockResponse: DomainDeprecationDetails[] = [
  {
    correctiveActions: {
      manualSteps: ['Step 1', 'Step 2', 'Step 3'],
      api: {
        method: 'POST',
        path: '/test',
      },
    },
    domainId: 'test_domain',
    level: 'critical',
    message: 'Test deprecation message 1',
  },
  {
    correctiveActions: {
      manualSteps: ['Step 1', 'Step 2', 'Step 3'],
    },
    domainId: 'test_domain',
    level: 'warning',
    message: 'Test deprecation message 2',
  },
];

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
        deprecations: deprecationService,
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

    await actions.table.clickRefreshButton();

    expect(deprecationService.getAllDeprecations).toHaveBeenCalledTimes(2);
  });

  it('shows critical and warning deprecations count', () => {
    const { find } = testBed;
    const criticalDeprecations = kibanaDeprecationsMockResponse.filter(
      (deprecation) => deprecation.level === 'critical'
    );
    const warningDeprecations = kibanaDeprecationsMockResponse.filter(
      (deprecation) => deprecation.level === 'warning'
    );

    expect(find('criticalDeprecationsCount').text()).toContain(criticalDeprecations.length);

    expect(find('warningDeprecationsCount').text()).toContain(warningDeprecations.length);
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { expectToBeAccessible } from '@kbn/test-jest-helpers';
import { IndicesTestBed, setup } from '../client_integration/home/indices_tab.helpers';
import {
  indexMappings,
  indexSettings,
  indexStats,
  setupEnvironment,
} from '../client_integration/helpers';
import {
  createDataStreamBackingIndex,
  createNonDataStreamIndex,
} from '../client_integration/home/data_streams_tab.helpers';

describe('A11y Indices tab', () => {
  let testBed: IndicesTestBed;
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];

  beforeEach(() => {
    const mockEnvironment = setupEnvironment();
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;
  });

  it('when there are no indices', async () => {
    httpRequestsMockHelpers.setLoadIndicesResponse([]);
    await act(async () => {
      testBed = await setup(httpSetup);
    });
    const { component } = testBed;
    component.update();
    await expectToBeAccessible(component);
  });

  it('when there are indices', async () => {
    httpRequestsMockHelpers.setLoadIndicesResponse([
      createNonDataStreamIndex('non-data-stream-test-index'),
      createDataStreamBackingIndex('data-stream-test-index', 'test-data-stream'),
    ]);
    await act(async () => {
      testBed = await setup(httpSetup);
    });
    const { component } = testBed;
    component.update();
    await expectToBeAccessible(component);
  });

  describe('index details flyout', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadIndicesResponse([
        createNonDataStreamIndex('non-data-stream-test-index'),
      ]);
      httpRequestsMockHelpers.setLoadIndexSettingsResponse(indexSettings);
      httpRequestsMockHelpers.setLoadIndexMappingResponse(indexMappings);
      httpRequestsMockHelpers.setLoadIndexStatsResponse(indexStats);
      await act(async () => {
        testBed = await setup(httpSetup);
      });
      const { component, find } = testBed;
      component.update();
      find('indexTableIndexNameLink').at(0).simulate('click');
      component.update();
    });

    it('summary tab', async () => {
      const { component, find } = testBed;
      expect(find('detailPanelTabSelected').text()).toEqual('Summary');
      await expectToBeAccessible(component);
    });
    ['settings', 'mappings', 'stats'].forEach((tab) => {
      it(`${tab} tab`, async () => {
        const { component, find, actions } = testBed;
        await actions.selectIndexDetailsTab(tab as 'settings');
        expect(find('detailPanelTabSelected').text().toLowerCase()).toEqual(tab);
        await expectToBeAccessible(component);
      });
    });

    it('edit settings tab', async () => {
      const { component, find, actions } = testBed;
      await actions.selectIndexDetailsTab('edit_settings');
      expect(find('detailPanelTabSelected').text()).toEqual('Edit settings');
      await expectToBeAccessible(component);
    });
  });
});

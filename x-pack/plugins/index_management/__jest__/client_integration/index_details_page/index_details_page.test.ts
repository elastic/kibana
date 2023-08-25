/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setupEnvironment } from '../helpers';
import { IndexDetailsPageTestBed, setup } from './index_details_page.helpers';
import { act } from 'react-dom/test-utils';
import { IndexDetailsSection } from '../../../public/application/sections/home/index_list/details_page';
import { testIndexMock } from './mocks';

describe('<IndexDetailsPage />', () => {
  let testBed: IndexDetailsPageTestBed;
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];

  beforeEach(async () => {
    const mockEnvironment = setupEnvironment();
    ({ httpSetup, httpRequestsMockHelpers } = mockEnvironment);
    // test_index is configured in initialEntries of the memory router
    httpRequestsMockHelpers.setLoadIndexDetailsResponse('test_index', testIndexMock);

    await act(async () => {
      testBed = await setup(httpSetup, {
        url: {
          locators: {
            get: () => ({ navigate: jest.fn() }),
          },
        },
      });
    });
    testBed.component.update();
  });

  describe('error section', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadIndexDetailsResponse('test_index', undefined, {
        statusCode: 400,
        message: 'Data for index .apm-agent-configuration was not found',
      });
      await act(async () => {
        testBed = await setup(httpSetup);
      });

      testBed.component.update();
    });
    it('displays an error callout when failed to load index details', async () => {
      expect(testBed.actions.errorSection.isDisplayed()).toBe(true);
    });

    it('resends a request when reload button is clicked', async () => {
      // already sent 2 requests while setting up the component
      const numberOfRequests = 2;
      expect(httpSetup.get).toHaveBeenCalledTimes(numberOfRequests);
      await testBed.actions.errorSection.clickReloadButton();
      expect(httpSetup.get).toHaveBeenCalledTimes(numberOfRequests + 1);
    });
  });

  it('displays index name in the header', () => {
    const header = testBed.actions.getHeader();
    // test_index is configured in initialEntries of the memory router
    expect(header).toEqual('test_index');
  });

  describe('Overview tab', () => {
    it('renders index detail', () => {
      expect(testBed.actions.indexDetailsContentExists()).toBe(true);
      expect(testBed.actions.indexStatsContentExists()).toBe(true);
      expect(testBed.actions.addDocCodeBlockExists()).toBe(true);
    });

    it('hides index stats from detail panels if enableIndexStats===false', async () => {
      await act(async () => {
        testBed = await setup(httpSetup, {
          config: { enableIndexStats: false },
        });
      });
      testBed.component.update();

      expect(testBed.actions.indexDetailsContentExists()).toBe(true);
      expect(testBed.actions.indexStatsContentExists()).toBe(false);
    });
  });

  it('documents tab', async () => {
    await testBed.actions.clickIndexDetailsTab(IndexDetailsSection.Documents);
    const tabContent = testBed.actions.getActiveTabContent();
    expect(tabContent).toEqual('Documents');
  });

  it('mappings tab', async () => {
    await testBed.actions.clickIndexDetailsTab(IndexDetailsSection.Mappings);
    const tabContent = testBed.actions.getActiveTabContent();
    expect(tabContent).toEqual('Mappings');
  });

  it('settings tab', async () => {
    await testBed.actions.clickIndexDetailsTab(IndexDetailsSection.Settings);
    const tabContent = testBed.actions.getActiveTabContent();
    expect(tabContent).toEqual('Settings');
  });

  it('pipelines tab', async () => {
    await testBed.actions.clickIndexDetailsTab(IndexDetailsSection.Pipelines);
    const tabContent = testBed.actions.getActiveTabContent();
    expect(tabContent).toEqual('Pipelines');
  });

  it('navigates back to indices', async () => {
    jest.spyOn(testBed.routerMock.history, 'push');
    await testBed.actions.clickBackToIndicesButton();
    expect(testBed.routerMock.history.push).toHaveBeenCalledTimes(1);
    expect(testBed.routerMock.history.push).toHaveBeenCalledWith('/indices');
  });

  it('renders a link to discover', () => {
    // we only need to test that the link is rendered since the link component has its own tests for navigation
    expect(testBed.actions.discoverLinkExists()).toBe(true);
  });

  it('opens an index context menu when "manage index" button is clicked', async () => {
    const {
      actions: { contextMenu },
    } = testBed;
    expect(contextMenu.isOpened()).toBe(false);
    await testBed.actions.contextMenu.clickManageIndexButton();
    expect(contextMenu.isOpened()).toBe(true);
  });
});

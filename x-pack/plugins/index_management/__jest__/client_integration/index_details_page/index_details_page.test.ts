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
import { testIndexMappings, testIndexMock, testIndexName, testIndexStats } from './mocks';
import { API_BASE_PATH, INTERNAL_API_BASE_PATH } from '../../../common';

describe('<IndexDetailsPage />', () => {
  let testBed: IndexDetailsPageTestBed;
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];

  beforeEach(async () => {
    const mockEnvironment = setupEnvironment();
    ({ httpSetup, httpRequestsMockHelpers } = mockEnvironment);
    // testIndexName is configured in initialEntries of the memory router
    httpRequestsMockHelpers.setLoadIndexDetailsResponse(testIndexName, testIndexMock);
    httpRequestsMockHelpers.setLoadIndexStatsResponse(testIndexName, testIndexStats);
    httpRequestsMockHelpers.setLoadIndexMappingResponse(testIndexName, testIndexMappings);

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
      httpRequestsMockHelpers.setLoadIndexDetailsResponse(testIndexName, undefined, {
        statusCode: 400,
        message: `Data for index ${testIndexName} was not found`,
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

  describe('Stats tab', () => {
    it('loads index stats from the API', async () => {
      await testBed.actions.clickIndexDetailsTab(IndexDetailsSection.Stats);
      expect(httpSetup.get).toHaveBeenLastCalledWith(`${API_BASE_PATH}/stats/${testIndexName}`, {
        asSystemRequest: undefined,
        body: undefined,
        query: undefined,
        version: undefined,
      });
    });

    it('renders index stats', async () => {
      await testBed.actions.clickIndexDetailsTab(IndexDetailsSection.Stats);
      const tabContent = testBed.actions.stats.getCodeBlockContent();
      expect(tabContent).toEqual(JSON.stringify(testIndexStats, null, 2));
    });

    it('sets the docs link href from the documenation service', async () => {
      await testBed.actions.clickIndexDetailsTab(IndexDetailsSection.Stats);
      const docsLinkHref = testBed.actions.stats.getDocsLinkHref();
      // the url from the mocked docs mock
      expect(docsLinkHref).toEqual(
        'https://www.elastic.co/guide/en/elasticsearch/reference/mocked-test-branch/indices-stats.html'
      );
    });

    it('renders a warning message if an index is not open', async () => {
      const testIndexMockWithClosedStatus = {
        ...testIndexMock,
        status: 'closed',
      };

      httpRequestsMockHelpers.setLoadIndexDetailsResponse(
        testIndexName,
        testIndexMockWithClosedStatus
      );

      await act(async () => {
        testBed = await setup(httpSetup);
      });
      testBed.component.update();

      await testBed.actions.clickIndexDetailsTab(IndexDetailsSection.Stats);
      expect(testBed.actions.stats.isWarningDisplayed()).toBe(true);
    });

    it('hides index stats tab if enableIndexStats===false', async () => {
      await act(async () => {
        testBed = await setup(httpSetup, {
          config: { enableIndexStats: false },
        });
      });
      testBed.component.update();

      expect(testBed.actions.stats.indexStatsTabExists()).toBe(false);
    });

    describe('Error handling', () => {
      beforeEach(async () => {
        httpRequestsMockHelpers.setLoadIndexStatsResponse(testIndexName, undefined, {
          statusCode: 500,
          message: 'Error',
        });
        await act(async () => {
          testBed = await setup(httpSetup);
        });

        testBed.component.update();
        await testBed.actions.clickIndexDetailsTab(IndexDetailsSection.Stats);
      });

      it('there is an error prompt', async () => {
        expect(testBed.actions.stats.isErrorDisplayed()).toBe(true);
      });

      it('resends a request when reload button is clicked', async () => {
        // already sent 3 requests while setting up the component
        const numberOfRequests = 3;
        expect(httpSetup.get).toHaveBeenCalledTimes(numberOfRequests);
        await testBed.actions.stats.clickErrorReloadButton();
        expect(httpSetup.get).toHaveBeenCalledTimes(numberOfRequests + 1);
      });
    });
  });

  it('loads index details from the API', async () => {
    expect(httpSetup.get).toHaveBeenLastCalledWith(
      `${INTERNAL_API_BASE_PATH}/indices/${testIndexName}`,
      { asSystemRequest: undefined, body: undefined, query: undefined, version: undefined }
    );
  });

  it('displays index name in the header', () => {
    const header = testBed.actions.getHeader();
    // testIndexName is configured in initialEntries of the memory router
    expect(header).toEqual(testIndexName);
  });

  describe('Overview tab', () => {
    it('renders index details', () => {
      expect(testBed.actions.overview.indexDetailsContentExists()).toBe(true);
      expect(testBed.actions.overview.indexStatsContentExists()).toBe(true);
      expect(testBed.actions.overview.addDocCodeBlockExists()).toBe(true);
    });

    it('hides index stats from detail panels if enableIndexStats===false', async () => {
      await act(async () => {
        testBed = await setup(httpSetup, {
          config: { enableIndexStats: false },
        });
      });
      testBed.component.update();

      expect(testBed.actions.overview.indexDetailsContentExists()).toBe(true);
      expect(testBed.actions.overview.indexStatsContentExists()).toBe(false);
    });
  });

  it('documents tab', async () => {
    await testBed.actions.clickIndexDetailsTab(IndexDetailsSection.Documents);
    const tabContent = testBed.actions.getActiveTabContent();
    expect(tabContent).toEqual('Documents');
  });

  describe('mappings tab', () => {
    it('loads mappings from the API', async () => {
      await testBed.actions.clickIndexDetailsTab(IndexDetailsSection.Mappings);
      expect(httpSetup.get).toHaveBeenLastCalledWith(`${API_BASE_PATH}/mapping/${testIndexName}`, {
        asSystemRequest: undefined,
        body: undefined,
        query: undefined,
        version: undefined,
      });
    });

    it('displays the mappings in the code block', async () => {
      await testBed.actions.clickIndexDetailsTab(IndexDetailsSection.Mappings);

      const tabContent = testBed.actions.mappings.getCodeBlockContent();
      expect(tabContent).toEqual(JSON.stringify(testIndexMappings, null, 2));
    });

    it('sets the docs link href from the documenation service', async () => {
      await testBed.actions.clickIndexDetailsTab(IndexDetailsSection.Mappings);
      const docsLinkHref = testBed.actions.mappings.getDocsLinkHref();
      // the url from the mocked docs mock
      expect(docsLinkHref).toEqual(
        'https://www.elastic.co/guide/en/elasticsearch/reference/mocked-test-branch/mapping.html'
      );
    });

    describe('error loading mappings', () => {
      beforeEach(async () => {
        httpRequestsMockHelpers.setLoadIndexMappingResponse(testIndexName, undefined, {
          statusCode: 400,
          message: `Was not able to load mappings`,
        });
        await act(async () => {
          testBed = await setup(httpSetup);
        });

        testBed.component.update();
        await testBed.actions.clickIndexDetailsTab(IndexDetailsSection.Mappings);
      });

      it('there is an error prompt', async () => {
        expect(testBed.actions.mappings.isErrorDisplayed()).toBe(true);
      });

      it('resends a request when reload button is clicked', async () => {
        // already sent 3 requests while setting up the component
        const numberOfRequests = 3;
        expect(httpSetup.get).toHaveBeenCalledTimes(numberOfRequests);
        await testBed.actions.mappings.clickErrorReloadButton();
        expect(httpSetup.get).toHaveBeenCalledTimes(numberOfRequests + 1);
      });
    });
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

  describe('context menu', () => {
    it('opens an index context menu when "manage index" button is clicked', async () => {
      expect(testBed.actions.contextMenu.isOpened()).toBe(false);
      await testBed.actions.contextMenu.clickManageIndexButton();
      expect(testBed.actions.contextMenu.isOpened()).toBe(true);
    });

    it('closes an index', async () => {
      // already sent 1 request while setting up the component
      const numberOfRequests = 1;
      expect(httpSetup.get).toHaveBeenCalledTimes(numberOfRequests);

      await testBed.actions.contextMenu.clickManageIndexButton();
      await testBed.actions.contextMenu.clickIndexAction('closeIndexMenuButton');
      expect(httpSetup.post).toHaveBeenCalledWith(`${API_BASE_PATH}/indices/close`, {
        body: JSON.stringify({ indices: [testIndexName] }),
      });
      expect(httpSetup.get).toHaveBeenCalledTimes(numberOfRequests + 1);
    });

    it('opens an index', async () => {
      httpRequestsMockHelpers.setLoadIndexDetailsResponse(testIndexName, {
        ...testIndexMock,
        status: 'close',
      });

      await act(async () => {
        testBed = await setup(httpSetup);
      });
      testBed.component.update();

      // already sent 2 requests while setting up the component
      const numberOfRequests = 2;
      expect(httpSetup.get).toHaveBeenCalledTimes(numberOfRequests);

      await testBed.actions.contextMenu.clickManageIndexButton();
      await testBed.actions.contextMenu.clickIndexAction('openIndexMenuButton');
      expect(httpSetup.post).toHaveBeenCalledWith(`${API_BASE_PATH}/indices/open`, {
        body: JSON.stringify({ indices: [testIndexName] }),
      });
      expect(httpSetup.get).toHaveBeenCalledTimes(numberOfRequests + 1);
    });

    it('forcemerges an index', async () => {
      // already sent 1 request while setting up the component
      const numberOfRequests = 1;
      expect(httpSetup.get).toHaveBeenCalledTimes(numberOfRequests);

      await testBed.actions.contextMenu.clickManageIndexButton();
      await testBed.actions.contextMenu.clickIndexAction('forcemergeIndexMenuButton');
      await testBed.actions.contextMenu.confirmForcemerge('2');
      expect(httpSetup.post).toHaveBeenCalledWith(`${API_BASE_PATH}/indices/forcemerge`, {
        body: JSON.stringify({ indices: [testIndexName], maxNumSegments: '2' }),
      });
      expect(httpSetup.get).toHaveBeenCalledTimes(numberOfRequests + 1);
    });

    it('refreshes an index', async () => {
      // already sent 1 request while setting up the component
      const numberOfRequests = 1;
      expect(httpSetup.get).toHaveBeenCalledTimes(numberOfRequests);

      await testBed.actions.contextMenu.clickManageIndexButton();
      await testBed.actions.contextMenu.clickIndexAction('refreshIndexMenuButton');
      expect(httpSetup.post).toHaveBeenCalledWith(`${API_BASE_PATH}/indices/refresh`, {
        body: JSON.stringify({ indices: [testIndexName] }),
      });
      expect(httpSetup.get).toHaveBeenCalledTimes(numberOfRequests + 1);
    });

    it(`clears an index's cache`, async () => {
      // already sent 1 request while setting up the component
      const numberOfRequests = 1;
      expect(httpSetup.get).toHaveBeenCalledTimes(numberOfRequests);

      await testBed.actions.contextMenu.clickManageIndexButton();
      await testBed.actions.contextMenu.clickIndexAction('clearCacheIndexMenuButton');
      expect(httpSetup.post).toHaveBeenCalledWith(`${API_BASE_PATH}/indices/clear_cache`, {
        body: JSON.stringify({ indices: [testIndexName] }),
      });
      expect(httpSetup.get).toHaveBeenCalledTimes(numberOfRequests + 1);
    });

    it(`flushes an index`, async () => {
      // already sent 1 request while setting up the component
      const numberOfRequests = 1;
      expect(httpSetup.get).toHaveBeenCalledTimes(numberOfRequests);

      await testBed.actions.contextMenu.clickManageIndexButton();
      await testBed.actions.contextMenu.clickIndexAction('flushIndexMenuButton');
      expect(httpSetup.post).toHaveBeenCalledWith(`${API_BASE_PATH}/indices/flush`, {
        body: JSON.stringify({ indices: [testIndexName] }),
      });
      expect(httpSetup.get).toHaveBeenCalledTimes(numberOfRequests + 1);
    });

    it(`deletes an index`, async () => {
      jest.spyOn(testBed.routerMock.history, 'push');
      // already sent 1 request while setting up the component
      const numberOfRequests = 1;
      expect(httpSetup.get).toHaveBeenCalledTimes(numberOfRequests);

      await testBed.actions.contextMenu.clickManageIndexButton();
      await testBed.actions.contextMenu.clickIndexAction('deleteIndexMenuButton');
      await testBed.actions.contextMenu.confirmDelete();
      expect(httpSetup.post).toHaveBeenCalledWith(`${API_BASE_PATH}/indices/delete`, {
        body: JSON.stringify({ indices: [testIndexName] }),
      });

      expect(testBed.routerMock.history.push).toHaveBeenCalledTimes(1);
      expect(testBed.routerMock.history.push).toHaveBeenCalledWith('/indices');
    });

    it(`unfreezes a frozen index`, async () => {
      httpRequestsMockHelpers.setLoadIndexDetailsResponse(testIndexName, {
        ...testIndexMock,
        isFrozen: true,
      });

      await act(async () => {
        testBed = await setup(httpSetup);
      });
      testBed.component.update();

      // already sent 1 request while setting up the component
      const numberOfRequests = 2;
      expect(httpSetup.get).toHaveBeenCalledTimes(numberOfRequests);

      await testBed.actions.contextMenu.clickManageIndexButton();
      await testBed.actions.contextMenu.clickIndexAction('unfreezeIndexMenuButton');
      expect(httpSetup.post).toHaveBeenCalledWith(`${API_BASE_PATH}/indices/unfreeze`, {
        body: JSON.stringify({ indices: [testIndexName] }),
      });
      expect(httpSetup.get).toHaveBeenCalledTimes(numberOfRequests + 1);
    });
  });
});

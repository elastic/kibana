/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setupEnvironment } from '../helpers';
import { IndexDetailsPageTestBed, setup } from './index_details_page.helpers';
import { act } from 'react-dom/test-utils';

import React from 'react';

import { IndexDetailsSection, IndexDetailsTab, IndexDetailsTabId } from '../../../common/constants';
import { API_BASE_PATH, Index, INTERNAL_API_BASE_PATH } from '../../../common';

import {
  breadcrumbService,
  IndexManagementBreadcrumb,
} from '../../../public/application/services/breadcrumbs';
import { humanizeTimeStamp } from '../../../public/application/sections/home/data_stream_list/humanize_time_stamp';
import { createDataStreamPayload } from '../home/data_streams_tab.helpers';
import {
  testIndexEditableSettingsAll,
  testIndexEditableSettingsLimited,
  testIndexMappings,
  testIndexMock,
  testIndexName,
  testIndexSettings,
  testIndexStats,
} from './mocks';

jest.mock('@kbn/kibana-react-plugin/public', () => {
  const original = jest.requireActual('@kbn/kibana-react-plugin/public');
  return {
    ...original,
    // Mocking CodeEditor, which uses React Monaco under the hood
    CodeEditor: (props: any) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockCodeEditor'}
        data-currentvalue={props.value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          props.onChange(e.currentTarget.getAttribute('data-currentvalue'));
        }}
      />
    ),
  };
});

const requestOptions = {
  asSystemRequest: undefined,
  body: undefined,
  query: undefined,
  version: undefined,
};
describe('<IndexDetailsPage />', () => {
  let testBed: IndexDetailsPageTestBed;
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  jest.spyOn(breadcrumbService, 'setBreadcrumbs');

  beforeEach(async () => {
    const mockEnvironment = setupEnvironment();
    ({ httpSetup, httpRequestsMockHelpers } = mockEnvironment);
    // testIndexName is configured in initialEntries of the memory router
    httpRequestsMockHelpers.setLoadIndexDetailsResponse(testIndexName, testIndexMock);
    httpRequestsMockHelpers.setLoadIndexStatsResponse(testIndexName, testIndexStats);
    httpRequestsMockHelpers.setLoadIndexMappingResponse(testIndexName, testIndexMappings);
    httpRequestsMockHelpers.setLoadIndexSettingsResponse(testIndexName, testIndexSettings);

    await act(async () => {
      testBed = await setup({
        httpSetup,
        dependencies: {
          url: {
            locators: {
              get: () => ({ navigate: jest.fn() }),
            },
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
        testBed = await setup({ httpSetup });
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

    it('renders an error section when no index name is provided', async () => {
      // already sent 2 requests while setting up the component
      const numberOfRequests = 2;
      expect(httpSetup.get).toHaveBeenCalledTimes(numberOfRequests);
      await act(async () => {
        testBed = await setup({ httpSetup, initialEntry: '/indices/index_details' });
      });
      testBed.component.update();
      expect(testBed.actions.errorSection.noIndexNameMessageIsDisplayed()).toBe(true);
      // no extra http request was sent
      expect(httpSetup.get).toHaveBeenCalledTimes(numberOfRequests);
    });
  });

  describe('Stats tab', () => {
    it('updates the breadcrumbs to index details stats', async () => {
      await testBed.actions.clickIndexDetailsTab(IndexDetailsSection.Stats);
      expect(breadcrumbService.setBreadcrumbs).toHaveBeenLastCalledWith(
        IndexManagementBreadcrumb.indexDetailsStats
      );
    });

    it('loads index stats from the API', async () => {
      await testBed.actions.clickIndexDetailsTab(IndexDetailsSection.Stats);
      expect(httpSetup.get).toHaveBeenLastCalledWith(
        `${API_BASE_PATH}/stats/${testIndexName}`,
        requestOptions
      );
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
        testBed = await setup({ httpSetup });
      });
      testBed.component.update();

      await testBed.actions.clickIndexDetailsTab(IndexDetailsSection.Stats);
      expect(testBed.actions.stats.isWarningDisplayed()).toBe(true);
    });

    it('hides index stats tab if enableIndexStats===false', async () => {
      await act(async () => {
        testBed = await setup({
          httpSetup,
          dependencies: {
            config: { enableIndexStats: false },
          },
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
          testBed = await setup({ httpSetup });
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
      requestOptions
    );
  });

  it('displays index name in the header', () => {
    const header = testBed.actions.getHeader();
    // testIndexName is configured in initialEntries of the memory router
    expect(header).toEqual(testIndexName);
  });

  describe('Overview tab', () => {
    it('updates the breadcrumbs to index details overview', async () => {
      expect(breadcrumbService.setBreadcrumbs).toHaveBeenLastCalledWith(
        IndexManagementBreadcrumb.indexDetailsOverview
      );
    });

    it('renders storage details', () => {
      const storageDetails = testBed.actions.overview.getStorageDetailsContent();
      expect(storageDetails).toBe(
        `Storage${testIndexMock.primary_size}Primary${testIndexMock.size}TotalShards${testIndexMock.primary} Primary / ${testIndexMock.replica} Replicas `
      );
    });

    it('renders status details', () => {
      const statusDetails = testBed.actions.overview.getStatusDetailsContent();
      expect(statusDetails).toBe(
        `Status${'Open'}${'Healthy'}${testIndexMock.documents} Document / ${
          testIndexMock.documents_deleted
        } Deleted`
      );
    });

    describe('aliases', () => {
      it('not rendered when no aliases', async () => {
        const aliasesExist = testBed.actions.overview.aliasesDetailsExist();
        expect(aliasesExist).toBe(false);
      });

      it('renders less than 3 aliases', async () => {
        const aliases = ['test_alias1', 'test_alias2'];
        const testWith2Aliases = {
          ...testIndexMock,
          aliases,
        };

        httpRequestsMockHelpers.setLoadIndexDetailsResponse(testIndexName, testWith2Aliases);

        await act(async () => {
          testBed = await setup({ httpSetup });
        });
        testBed.component.update();

        const aliasesExist = testBed.actions.overview.aliasesDetailsExist();
        expect(aliasesExist).toBe(true);

        const aliasesContent = testBed.actions.overview.getAliasesDetailsContent();
        expect(aliasesContent).toBe(
          `Aliases${aliases.length}AliasesView all aliases${aliases.join('')}`
        );
      });

      it('renders more than 3 aliases', async () => {
        const aliases = ['test_alias1', 'test_alias2', 'test_alias3', 'test_alias4', 'test_alias5'];
        const testWith5Aliases = {
          ...testIndexMock,
          aliases,
        };

        httpRequestsMockHelpers.setLoadIndexDetailsResponse(testIndexName, testWith5Aliases);

        await act(async () => {
          testBed = await setup({ httpSetup });
        });
        testBed.component.update();

        const aliasesExist = testBed.actions.overview.aliasesDetailsExist();
        expect(aliasesExist).toBe(true);

        const aliasesContent = testBed.actions.overview.getAliasesDetailsContent();
        expect(aliasesContent).toBe(
          `Aliases${aliases.length}AliasesView all aliases${aliases.slice(0, 3).join('')}+${2}`
        );
      });
    });

    describe('data stream', () => {
      it('not rendered when no data stream', async () => {
        const aliasesExist = testBed.actions.overview.dataStreamDetailsExist();
        expect(aliasesExist).toBe(false);
      });

      it('renders data stream details', async () => {
        const dataStreamName = 'test_data_stream';
        const testWithDataStream: Index = {
          ...testIndexMock,
          data_stream: dataStreamName,
        };
        const dataStreamDetails = createDataStreamPayload({
          name: dataStreamName,
          generation: 5,
          maxTimeStamp: 1696600607689,
        });

        httpRequestsMockHelpers.setLoadIndexDetailsResponse(testIndexName, testWithDataStream);
        httpRequestsMockHelpers.setLoadDataStreamResponse(dataStreamName, dataStreamDetails);

        await act(async () => {
          testBed = await setup({ httpSetup });
        });
        testBed.component.update();

        const dataStreamDetailsExist = testBed.actions.overview.dataStreamDetailsExist();
        expect(dataStreamDetailsExist).toBe(true);

        const dataStreamContent = testBed.actions.overview.getDataStreamDetailsContent();
        expect(dataStreamContent).toBe(
          `Data stream${
            dataStreamDetails.generation
          }GenerationsSee detailsRelated templateLast update${humanizeTimeStamp(
            dataStreamDetails.maxTimeStamp!
          )}`
        );
      });

      it('renders error message if the request fails', async () => {
        const dataStreamName = 'test_data_stream';
        const testWithDataStream: Index = {
          ...testIndexMock,
          data_stream: dataStreamName,
        };

        httpRequestsMockHelpers.setLoadIndexDetailsResponse(testIndexName, testWithDataStream);
        httpRequestsMockHelpers.setLoadDataStreamResponse(dataStreamName, undefined, {
          statusCode: 400,
          message: `Unable to load data stream details`,
        });

        await act(async () => {
          testBed = await setup({ httpSetup });
        });
        testBed.component.update();

        const dataStreamDetailsExist = testBed.actions.overview.dataStreamDetailsExist();
        expect(dataStreamDetailsExist).toBe(true);

        const dataStreamContent = testBed.actions.overview.getDataStreamDetailsContent();
        expect(dataStreamContent).toBe(
          `Data streamUnable to load data stream detailsReloadLast update`
        );

        // already sent 3 requests while setting up the component
        const numberOfRequests = 3;
        expect(httpSetup.get).toHaveBeenCalledTimes(numberOfRequests);
        await testBed.actions.overview.reloadDataStreamDetails();
        expect(httpSetup.get).toHaveBeenCalledTimes(numberOfRequests + 1);
      });
    });

    it('hides storage and status details if enableIndexStats===false', async () => {
      await act(async () => {
        testBed = await setup({
          httpSetup,
          dependencies: {
            config: { enableIndexStats: false },
          },
        });
      });
      testBed.component.update();

      expect(testBed.actions.overview.statusDetailsExist()).toBe(false);
      expect(testBed.actions.overview.storageDetailsExist()).toBe(false);
    });

    it('renders code block', () => {
      expect(testBed.actions.overview.addDocCodeBlockExists()).toBe(true);
    });

    it('renders index name badges from the extensions service', async () => {
      const testBadges = ['testBadge1', 'testBadge2'];
      await act(async () => {
        testBed = await setup({
          httpSetup,
          dependencies: {
            services: {
              extensionsService: {
                _badges: testBadges.map((badge) => ({
                  matchIndex: () => true,
                  label: badge,
                  color: 'primary',
                })),
              },
            },
          },
        });
      });
      testBed.component.update();
      const header = testBed.actions.getHeader();
      expect(header).toEqual(`${testIndexName} ${testBadges.join(' ')}`);
    });

    describe('extension service overview content', () => {
      it('renders the content instead of the default code block', async () => {
        const extensionsServiceOverview = 'Test content via extensions service';
        await act(async () => {
          testBed = await setup({
            httpSetup,
            dependencies: {
              services: {
                extensionsService: {
                  _indexOverviewContent: {
                    renderContent: () => extensionsServiceOverview,
                  },
                },
              },
            },
          });
        });
        testBed.component.update();

        expect(testBed.actions.overview.addDocCodeBlockExists()).toBe(false);
        const content = testBed.actions.getActiveTabContent();
        expect(content).toContain(extensionsServiceOverview);
      });
    });
  });

  describe('Mappings tab', () => {
    it('updates the breadcrumbs to index details mappings', async () => {
      await testBed.actions.clickIndexDetailsTab(IndexDetailsSection.Mappings);
      expect(breadcrumbService.setBreadcrumbs).toHaveBeenLastCalledWith(
        IndexManagementBreadcrumb.indexDetailsMappings
      );
    });
    it('loads mappings from the API', async () => {
      await testBed.actions.clickIndexDetailsTab(IndexDetailsSection.Mappings);
      expect(httpSetup.get).toHaveBeenLastCalledWith(
        `${API_BASE_PATH}/mapping/${testIndexName}`,
        requestOptions
      );
    });

    it('displays the mappings in the code block', async () => {
      await testBed.actions.clickIndexDetailsTab(IndexDetailsSection.Mappings);

      const tabContent = testBed.actions.mappings.getCodeBlockContent();
      expect(tabContent).toEqual(JSON.stringify(testIndexMappings, null, 2));
    });

    it('sets the docs link href from the documentation service', async () => {
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
          testBed = await setup({ httpSetup });
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

  describe('Settings tab', () => {
    it('updates the breadcrumbs to index details settings', async () => {
      await testBed.actions.clickIndexDetailsTab(IndexDetailsSection.Settings);
      expect(breadcrumbService.setBreadcrumbs).toHaveBeenLastCalledWith(
        IndexManagementBreadcrumb.indexDetailsSettings
      );
    });

    it('loads settings from the API', async () => {
      await testBed.actions.clickIndexDetailsTab(IndexDetailsSection.Settings);
      expect(httpSetup.get).toHaveBeenLastCalledWith(
        `${API_BASE_PATH}/settings/${testIndexName}`,
        requestOptions
      );
    });

    it('displays the settings in the code block', async () => {
      await testBed.actions.clickIndexDetailsTab(IndexDetailsSection.Settings);

      const tabContent = testBed.actions.settings.getCodeBlockContent();
      expect(tabContent).toEqual(JSON.stringify(testIndexSettings, null, 2));
    });

    it('sets the docs link href from the documentation service', async () => {
      await testBed.actions.clickIndexDetailsTab(IndexDetailsSection.Settings);
      const docsLinkHref = testBed.actions.settings.getDocsLinkHref();
      // the url from the mocked docs mock
      expect(docsLinkHref).toEqual(
        'https://www.elastic.co/guide/en/elasticsearch/reference/mocked-test-branch/index-modules.html#index-modules-settings'
      );
    });

    describe('error loading settings', () => {
      beforeEach(async () => {
        httpRequestsMockHelpers.setLoadIndexSettingsResponse(testIndexName, undefined, {
          statusCode: 400,
          message: `Was not able to load settings`,
        });
        await act(async () => {
          testBed = await setup({ httpSetup });
        });

        testBed.component.update();
        await testBed.actions.clickIndexDetailsTab(IndexDetailsSection.Settings);
      });

      it('there is an error prompt', async () => {
        expect(testBed.actions.settings.isErrorDisplayed()).toBe(true);
      });

      it('resends a request when reload button is clicked', async () => {
        // already sent 3 requests while setting up the component
        const numberOfRequests = 3;
        expect(httpSetup.get).toHaveBeenCalledTimes(numberOfRequests);
        await testBed.actions.settings.clickErrorReloadButton();
        expect(httpSetup.get).toHaveBeenCalledTimes(numberOfRequests + 1);
      });
    });

    describe('edit settings', () => {
      beforeEach(async () => {
        await testBed.actions.clickIndexDetailsTab(IndexDetailsSection.Settings);
        await testBed.actions.settings.clickEditModeSwitch();
      });

      it('displays all editable settings (flattened and filtered)', () => {
        const editorContent = testBed.actions.settings.getCodeEditorContent();
        expect(editorContent).toEqual(JSON.stringify(testIndexEditableSettingsAll, null, 2));
      });

      it('displays limited editable settings (flattened and filtered)', async () => {
        await act(async () => {
          testBed = await setup({
            httpSetup,
            dependencies: {
              config: { editableIndexSettings: 'limited' },
            },
          });
        });

        testBed.component.update();
        await testBed.actions.clickIndexDetailsTab(IndexDetailsSection.Settings);
        await testBed.actions.settings.clickEditModeSwitch();
        const editorContent = testBed.actions.settings.getCodeEditorContent();
        expect(editorContent).toEqual(JSON.stringify(testIndexEditableSettingsLimited, null, 2));
      });

      it('updates the settings', async () => {
        const updatedSettings = { ...testIndexEditableSettingsAll, 'index.priority': '2' };
        await testBed.actions.settings.updateCodeEditorContent(JSON.stringify(updatedSettings));
        await testBed.actions.settings.saveSettings();
        expect(httpSetup.put).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/settings/${testIndexName}`,
          {
            asSystemRequest: undefined,
            body: JSON.stringify({ 'index.priority': '2' }),
            query: undefined,
            version: undefined,
          }
        );
      });

      it('reloads the settings after an update', async () => {
        const numberOfRequests = 2;
        expect(httpSetup.get).toHaveBeenCalledTimes(numberOfRequests);
        const updatedSettings = { ...testIndexEditableSettingsAll, 'index.priority': '2' };
        await testBed.actions.settings.updateCodeEditorContent(JSON.stringify(updatedSettings));
        await testBed.actions.settings.saveSettings();
        expect(httpSetup.get).toHaveBeenCalledTimes(numberOfRequests + 1);
        expect(httpSetup.get).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/settings/${testIndexName}`,
          requestOptions
        );
      });

      it('resets the changes in the editor', async () => {
        const updatedSettings = { ...testIndexEditableSettingsAll, 'index.priority': '2' };
        await testBed.actions.settings.updateCodeEditorContent(JSON.stringify(updatedSettings));
        await testBed.actions.settings.resetChanges();
        const editorContent = testBed.actions.settings.getCodeEditorContent();
        expect(editorContent).toEqual(JSON.stringify(testIndexEditableSettingsAll, null, 2));
      });
    });
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
        testBed = await setup({ httpSetup });
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
        testBed = await setup({ httpSetup });
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

  describe('index name with a percent sign', () => {
    const percentSignName = 'test%';
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadIndexDetailsResponse(encodeURIComponent(percentSignName), {
        ...testIndexMock,
        name: percentSignName,
      });
      httpRequestsMockHelpers.setLoadIndexSettingsResponse(
        encodeURIComponent(percentSignName),
        testIndexSettings
      );

      await act(async () => {
        testBed = await setup({
          httpSetup,
          initialEntry: `/indices/index_details?indexName=${encodeURIComponent(percentSignName)}`,
        });
      });
      testBed.component.update();
    });
    it('loads the index details with the encoded index name', () => {
      expect(httpSetup.get).toHaveBeenLastCalledWith(
        `${INTERNAL_API_BASE_PATH}/indices/${encodeURIComponent(percentSignName)}`,
        requestOptions
      );
    });
    it('loads mappings with the encoded index name', async () => {
      await testBed.actions.clickIndexDetailsTab(IndexDetailsSection.Mappings);
      expect(httpSetup.get).toHaveBeenLastCalledWith(
        `${API_BASE_PATH}/mapping/${encodeURIComponent(percentSignName)}`,
        requestOptions
      );
    });
    it('loads settings with the encoded index name', async () => {
      await testBed.actions.clickIndexDetailsTab(IndexDetailsSection.Settings);
      expect(httpSetup.get).toHaveBeenLastCalledWith(
        `${API_BASE_PATH}/settings/${encodeURIComponent(percentSignName)}`,
        requestOptions
      );
    });
    it('updates settings with the encoded index name', async () => {
      await testBed.actions.clickIndexDetailsTab(IndexDetailsSection.Settings);
      await testBed.actions.settings.clickEditModeSwitch();
      const updatedSettings = { ...testIndexEditableSettingsAll, 'index.priority': '2' };
      await testBed.actions.settings.updateCodeEditorContent(JSON.stringify(updatedSettings));
      await testBed.actions.settings.saveSettings();
      expect(httpSetup.put).toHaveBeenLastCalledWith(
        `${API_BASE_PATH}/settings/${encodeURIComponent(percentSignName)}`,
        {
          asSystemRequest: undefined,
          body: JSON.stringify({ 'index.priority': '2' }),
          query: undefined,
          version: undefined,
        }
      );
    });
    it('loads stats with the encoded index name', async () => {
      await testBed.actions.clickIndexDetailsTab(IndexDetailsSection.Stats);
      expect(httpSetup.get).toHaveBeenLastCalledWith(
        `${API_BASE_PATH}/stats/${encodeURIComponent(percentSignName)}`,
        requestOptions
      );
    });
  });

  describe('extension service tabs', () => {
    const testTabId = 'testTab' as IndexDetailsTabId;
    const testContent = 'Test content';
    const additionalTab: IndexDetailsTab = {
      id: testTabId,
      name: 'Test tab',
      renderTabContent: () => {
        return <span>{testContent}</span>;
      },
      order: 1,
    };
    beforeAll(async () => {
      const extensionsServiceMock = {
        indexDetailsTabs: [additionalTab],
      };
      await act(async () => {
        testBed = await setup({
          httpSetup,
          dependencies: {
            services: { extensionsService: extensionsServiceMock },
          },
        });
      });
      testBed.component.update();
    });

    it('renders an additional tab', async () => {
      await testBed.actions.clickIndexDetailsTab(testTabId);
      const content = testBed.actions.getActiveTabContent();
      expect(content).toEqual(testContent);
    });

    it('additional tab is the first in the order', () => {
      const tabs = testBed.actions.getIndexDetailsTabs();
      expect(tabs).toEqual(['Test tab', 'Overview', 'Mappings', 'Settings', 'Statistics']);
    });

    it('additional tab is the last in the order', async () => {
      const extensionsServiceMock = {
        indexDetailsTabs: [{ ...additionalTab, order: 100 }],
      };
      await act(async () => {
        testBed = await setup({
          httpSetup,
          dependencies: {
            services: { extensionsService: extensionsServiceMock },
          },
        });
      });
      testBed.component.update();
      const tabs = testBed.actions.getIndexDetailsTabs();
      expect(tabs).toEqual(['Overview', 'Mappings', 'Settings', 'Statistics', 'Test tab']);
    });
  });
});

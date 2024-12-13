/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { createMemoryHistory } from 'history';
import { notificationServiceMock } from '@kbn/core/public/mocks';

import {
  breadcrumbService,
  IndexManagementBreadcrumb,
} from '../../../public/application/services/breadcrumbs';
import { API_BASE_PATH, MAX_DATA_RETENTION } from '../../../common/constants';
import * as fixtures from '../../../test/fixtures';
import { setupEnvironment } from '../helpers';
import { notificationService } from '../../../public/application/services/notification';

import {
  DataStreamsTabTestBed,
  setup,
  createDataStreamPayload,
  createDataStreamBackingIndex,
  createNonDataStreamIndex,
} from './data_streams_tab.helpers';

const nonBreakingSpace = ' ';

const urlServiceMock = {
  locators: {
    get: () => ({
      getLocation: async () => ({
        app: '',
        path: '',
        state: {},
      }),
      getUrl: async ({ policyName }: { policyName: string }) => `/test/${policyName}`,
      navigate: async () => {},
      useUrl: () => '',
    }),
  },
};

describe('Data Streams tab', () => {
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();
  let testBed: DataStreamsTabTestBed;
  jest.spyOn(breadcrumbService, 'setBreadcrumbs');

  describe('when there are no data streams', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadIndicesResponse([]);
      httpRequestsMockHelpers.setLoadDataStreamsResponse([]);
      httpRequestsMockHelpers.setLoadTemplatesResponse({ templates: [], legacyTemplates: [] });
    });

    test('displays an empty prompt', async () => {
      testBed = await setup(httpSetup, {
        url: urlServiceMock,
      });

      await act(async () => {
        testBed.actions.goToDataStreamsList();
      });

      const { exists, component } = testBed;
      component.update();

      expect(exists('sectionLoading')).toBe(false);
      expect(exists('emptyPrompt')).toBe(true);
    });

    test('when Fleet is disabled, goes to index templates tab when "Get started" link is clicked', async () => {
      testBed = await setup(httpSetup, {
        plugins: {},
        url: urlServiceMock,
      });

      await act(async () => {
        testBed.actions.goToDataStreamsList();
      });

      const { actions, exists, component } = testBed;
      component.update();

      await act(async () => {
        actions.clickEmptyPromptIndexTemplateLink();
      });

      expect(exists('templateList')).toBe(true);
    });

    test('when Fleet is enabled, links to Fleet', async () => {
      testBed = await setup(httpSetup, {
        plugins: { isFleetEnabled: true },
        url: urlServiceMock,
      });

      await act(async () => {
        testBed.actions.goToDataStreamsList();
      });

      const { findEmptyPromptIndexTemplateLink, component } = testBed;
      component.update();

      // Assert against the text because the href won't be available, due to dependency upon our core mock.
      expect(findEmptyPromptIndexTemplateLink().text()).toBe('Fleet');
    });

    test('when hidden data streams are filtered by default, the table is rendered empty', async () => {
      const hiddenDataStream = createDataStreamPayload({
        name: 'hidden-data-stream',
        hidden: true,
      });
      httpRequestsMockHelpers.setLoadDataStreamsResponse([hiddenDataStream]);

      testBed = await setup(httpSetup, {
        plugins: {},
        url: urlServiceMock,
      });

      await act(async () => {
        testBed.actions.goToDataStreamsList();
      });

      testBed.component.update();
      expect(testBed.find('dataStreamTable').text()).toContain('No data streams found');
    });

    test('updates the breadcrumbs to data streams', () => {
      expect(breadcrumbService.setBreadcrumbs).toHaveBeenLastCalledWith(
        IndexManagementBreadcrumb.dataStreams
      );
    });
  });

  describe('when there are data streams', () => {
    const notificationsServiceMock = notificationServiceMock.createStartContract();

    beforeEach(async () => {
      const {
        setLoadIndicesResponse,
        setLoadDataStreamsResponse,
        setLoadDataStreamResponse,
        setLoadTemplateResponse,
        setLoadTemplatesResponse,
      } = httpRequestsMockHelpers;

      setLoadIndicesResponse([
        createDataStreamBackingIndex('data-stream-index', 'dataStream1'),
        createNonDataStreamIndex('non-data-stream-index'),
      ]);

      const dataStreamForDetailPanel = createDataStreamPayload({
        name: 'dataStream1',
        storageSize: '5b',
        storageSizeBytes: 5,
        // metering API mock
        meteringStorageSize: '156kb',
        meteringStorageSizeBytes: 156000,
        meteringDocsCount: 10000,
      });

      setLoadDataStreamsResponse([
        dataStreamForDetailPanel,
        createDataStreamPayload({
          name: 'dataStream2',
          storageSize: '1kb',
          storageSizeBytes: 1000,
          // metering API mock
          meteringStorageSize: '156kb',
          meteringStorageSizeBytes: 156000,
          meteringDocsCount: 10000,
          lifecycle: {
            enabled: true,
            data_retention: '7d',
            effective_retention: '5d',
            retention_determined_by: MAX_DATA_RETENTION,
          },
        }),
      ]);

      setLoadDataStreamResponse(dataStreamForDetailPanel.name, dataStreamForDetailPanel);

      const indexTemplate = fixtures.getTemplate({ name: 'indexTemplate' });
      setLoadTemplatesResponse({ templates: [indexTemplate], legacyTemplates: [] });
      setLoadTemplateResponse(indexTemplate.name, indexTemplate);

      notificationService.setup(notificationsServiceMock);
      testBed = await setup(httpSetup, {
        history: createMemoryHistory(),
        services: {
          notificationService,
        },
      });
      await act(async () => {
        testBed.actions.goToDataStreamsList();
      });
      testBed.component.update();
    });

    test('lists them in the table', async () => {
      const { table } = testBed;
      const { tableCellsValues } = table.getMetaData('dataStreamTable');

      expect(tableCellsValues).toEqual([
        ['', 'dataStream1', 'green', '1', 'Standard', '7 days', 'Delete'],
        ['', 'dataStream2', 'green', '1', 'Standard', '5 days ', 'Delete'],
      ]);
    });

    test('highlights datastreams who are using max retention', async () => {
      const { exists } = testBed;

      expect(exists('usingMaxRetention')).toBe(true);
    });

    test('has a button to reload the data streams', async () => {
      const { exists, actions } = testBed;

      expect(exists('reloadButton')).toBe(true);

      await act(async () => {
        actions.clickReloadButton();
      });

      expect(httpSetup.get).toHaveBeenLastCalledWith(
        `${API_BASE_PATH}/data_streams`,
        expect.anything()
      );
    });

    test('has a switch that will reload the data streams with additional stats when clicked', async () => {
      const { exists, actions, table } = testBed;

      expect(exists('includeStatsSwitch')).toBe(true);

      // Changing the switch will automatically reload the data streams.
      await actions.clickIncludeStatsSwitch();

      expect(httpSetup.get).toHaveBeenLastCalledWith(
        `${API_BASE_PATH}/data_streams`,
        expect.anything()
      );

      // The table renders with the stats columns though.
      const { tableCellsValues } = table.getMetaData('dataStreamTable');
      expect(tableCellsValues).toEqual([
        [
          '',
          'dataStream1',
          'green',
          'December 31st, 1969 7:00:00 PM',
          '5b',
          '1',
          'Standard',
          '7 days',
          'Delete',
        ],
        [
          '',
          'dataStream2',
          'green',
          'December 31st, 1969 7:00:00 PM',
          '1kb',
          '1',
          'Standard',
          '5 days ',
          'Delete',
        ],
      ]);
    });

    test('sorting on stats sorts by bytes value instead of human readable value', async () => {
      // Guards against regression of #86122.
      const { actions, table } = testBed;

      await actions.clickIncludeStatsSwitch();

      actions.sortTableOnStorageSize();

      // The table sorts by the underlying byte values in ascending order, instead of sorting by
      // the human-readable string values.
      const { tableCellsValues } = table.getMetaData('dataStreamTable');
      expect(tableCellsValues).toEqual([
        [
          '',
          'dataStream1',
          'green',
          'December 31st, 1969 7:00:00 PM',
          '5b',
          '1',
          'Standard',
          '7 days',
          'Delete',
        ],
        [
          '',
          'dataStream2',
          'green',
          'December 31st, 1969 7:00:00 PM',
          '1kb',
          '1',
          'Standard',
          '5 days ',
          'Delete',
        ],
      ]);

      // Revert sorting back on Name column to not impact the rest of the tests
      actions.sortTableOnName();
    });

    test(`doesn't hide stats toggle if enableDataStreamStats===false`, async () => {
      testBed = await setup(httpSetup, {
        config: {
          enableDataStreamStats: false,
        },
      });

      const { actions, component, exists } = testBed;

      await act(async () => {
        actions.goToDataStreamsList();
      });

      component.update();

      expect(exists('includeStatsSwitch')).toBeTruthy();
    });

    test('shows storage size and documents count if enableSizeAndDocCount===true, enableDataStreamStats==false', async () => {
      testBed = await setup(httpSetup, {
        config: {
          enableSizeAndDocCount: true,
          enableDataStreamStats: false,
        },
      });

      const { actions, component, table } = testBed;

      await act(async () => {
        actions.goToDataStreamsList();
      });

      component.update();

      await actions.clickIncludeStatsSwitch();

      const { tableCellsValues } = table.getMetaData('dataStreamTable');
      expect(tableCellsValues).toEqual([
        ['', 'dataStream1', 'green', '156kb', '10000', '1', 'Standard', '7 days', 'Delete'],
        ['', 'dataStream2', 'green', '156kb', '10000', '1', 'Standard', '5 days ', 'Delete'],
      ]);
    });

    test('shows last updated and storage size if enableDataStreamStats===true, enableSizeAndDocCount===false', async () => {
      testBed = await setup(httpSetup, {
        config: {
          enableDataStreamStats: true,
          enableSizeAndDocCount: false,
        },
      });

      const { actions, component, table } = testBed;

      await act(async () => {
        actions.goToDataStreamsList();
      });

      component.update();

      await actions.clickIncludeStatsSwitch();

      const { tableCellsValues } = table.getMetaData('dataStreamTable');
      expect(tableCellsValues).toEqual([
        [
          '',
          'dataStream1',
          'green',
          'December 31st, 1969 7:00:00 PM',
          '5b',
          '1',
          'Standard',
          '7 days',
          'Delete',
        ],
        [
          '',
          'dataStream2',
          'green',
          'December 31st, 1969 7:00:00 PM',
          '1kb',
          '1',
          'Standard',
          '5 days ',
          'Delete',
        ],
      ]);
    });

    test('clicking the indices count navigates to the backing indices', async () => {
      const { table, actions } = testBed;
      await actions.clickIndicesAt(0);
      expect(table.getMetaData('indexTable').tableCellsValues).toEqual([
        ['', 'data-stream-index', '', '', '', '', '0', '', 'dataStream1'],
      ]);
    });

    describe('row actions', () => {
      test('can delete', () => {
        const { findDeleteActionAt } = testBed;
        const deleteAction = findDeleteActionAt(0);
        expect(deleteAction.length).toBe(1);
      });
    });

    describe('deleting a data stream', () => {
      test('shows a confirmation modal', async () => {
        const {
          actions: { clickDeleteActionAt },
          findDeleteConfirmationModal,
        } = testBed;
        clickDeleteActionAt(0);
        const confirmationModal = findDeleteConfirmationModal();
        expect(confirmationModal).toBeDefined();
      });

      test('sends a request to the Delete API', async () => {
        const {
          actions: { clickDeleteActionAt, clickConfirmDelete },
        } = testBed;
        clickDeleteActionAt(0);

        httpRequestsMockHelpers.setDeleteDataStreamResponse({
          results: {
            dataStreamsDeleted: ['dataStream1'],
            errors: [],
          },
        });

        await clickConfirmDelete();

        expect(httpSetup.post).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/delete_data_streams`,
          expect.objectContaining({ body: JSON.stringify({ dataStreams: ['dataStream1'] }) })
        );
      });
    });

    describe('detail panel', () => {
      test('opens when the data stream name in the table is clicked', async () => {
        const { actions, findDetailPanel, findDetailPanelTitle } = testBed;
        httpRequestsMockHelpers.setLoadDataStreamResponse('dataStream1');
        await actions.clickNameAt(0);
        expect(findDetailPanel().length).toBe(1);
        expect(findDetailPanelTitle()).toBe('dataStream1');
      });

      test('deletes the data stream when delete button is clicked', async () => {
        const {
          actions: { clickNameAt, clickDeleteDataStreamButton, clickConfirmDelete },
        } = testBed;

        await clickNameAt(0);

        clickDeleteDataStreamButton();

        httpRequestsMockHelpers.setDeleteDataStreamResponse({
          results: {
            dataStreamsDeleted: ['dataStream1'],
            errors: [],
          },
        });

        await clickConfirmDelete();

        expect(httpSetup.post).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/delete_data_streams`,
          expect.objectContaining({ body: JSON.stringify({ dataStreams: ['dataStream1'] }) })
        );
      });

      describe('update data retention', () => {
        test('Should show disabled or infinite retention period accordingly in table and flyout', async () => {
          const { setLoadDataStreamsResponse, setLoadDataStreamResponse } = httpRequestsMockHelpers;

          const ds1 = createDataStreamPayload({
            name: 'dataStream1',
            lifecycle: {
              enabled: false,
            },
          });
          const ds2 = createDataStreamPayload({
            name: 'dataStream2',
            lifecycle: {
              enabled: true,
            },
          });

          setLoadDataStreamsResponse([ds1, ds2]);
          setLoadDataStreamResponse(ds1.name, ds1);

          testBed = await setup(httpSetup, {
            history: createMemoryHistory(),
            url: urlServiceMock,
          });
          await act(async () => {
            testBed.actions.goToDataStreamsList();
          });
          testBed.component.update();

          const { actions, find, table } = testBed;
          const { tableCellsValues } = table.getMetaData('dataStreamTable');

          expect(tableCellsValues).toEqual([
            ['', 'dataStream1', 'green', '1', 'Standard', 'Disabled', 'Delete'],
            ['', 'dataStream2', 'green', '1', 'Standard', '', 'Delete'],
          ]);

          await actions.clickNameAt(0);
          expect(find('dataRetentionDetail').text()).toBe('Disabled');

          await act(async () => {
            testBed.find('closeDetailsButton').simulate('click');
          });
          testBed.component.update();

          setLoadDataStreamResponse(ds2.name, ds2);
          await actions.clickNameAt(1);
          expect(find('dataRetentionDetail').text()).toBe('Keep data indefinitely');
        });

        test('can set data retention period', async () => {
          const {
            actions: { clickNameAt, clickEditDataRetentionButton },
          } = testBed;

          await clickNameAt(0);

          clickEditDataRetentionButton();

          httpRequestsMockHelpers.setEditDataRetentionResponse('dataStream1', {
            success: true,
          });

          // set data retention value
          testBed.form.setInputValue('dataRetentionValue', '7');
          // Set data retention unit
          testBed.find('show-filters-button').simulate('click');
          testBed.find('filter-option-h').simulate('click');

          await act(async () => {
            testBed.find('saveButton').simulate('click');
          });
          testBed.component.update();

          expect(httpSetup.put).toHaveBeenLastCalledWith(
            `${API_BASE_PATH}/data_streams/dataStream1/data_retention`,
            expect.objectContaining({ body: JSON.stringify({ dataRetention: '7h' }) })
          );
        });

        test('can disable lifecycle', async () => {
          const {
            actions: { clickNameAt, clickEditDataRetentionButton },
          } = testBed;

          await clickNameAt(0);

          clickEditDataRetentionButton();

          httpRequestsMockHelpers.setEditDataRetentionResponse('dataStream1', {
            success: true,
          });

          testBed.form.toggleEuiSwitch('dataRetentionEnabledField.input');

          await act(async () => {
            testBed.find('saveButton').simulate('click');
          });
          testBed.component.update();

          expect(httpSetup.put).toHaveBeenLastCalledWith(
            `${API_BASE_PATH}/data_streams/dataStream1/data_retention`,
            expect.objectContaining({ body: JSON.stringify({ enabled: false }) })
          );
        });

        test('allows to set infinite retention period', async () => {
          const {
            actions: { clickNameAt, clickEditDataRetentionButton },
          } = testBed;

          await clickNameAt(0);

          clickEditDataRetentionButton();

          httpRequestsMockHelpers.setEditDataRetentionResponse('dataStream1', {
            success: true,
          });

          testBed.form.toggleEuiSwitch('infiniteRetentionPeriod.input');

          await act(async () => {
            testBed.find('saveButton').simulate('click');
          });
          testBed.component.update();

          expect(httpSetup.put).toHaveBeenLastCalledWith(
            `${API_BASE_PATH}/data_streams/dataStream1/data_retention`,
            expect.objectContaining({ body: JSON.stringify({}) })
          );
        });
      });

      test('clicking index template name navigates to the index template details', async () => {
        const {
          actions: { clickNameAt, clickDetailPanelIndexTemplateLink },
          findDetailPanelIndexTemplateLink,
          component,
          find,
        } = testBed;

        await clickNameAt(0);

        const indexTemplateLink = findDetailPanelIndexTemplateLink();
        expect(indexTemplateLink.text()).toBe('indexTemplate');

        await clickDetailPanelIndexTemplateLink();

        component.update();
        expect(find('summaryTab').exists()).toBeTruthy();
        expect(find('title').text().trim()).toBe('indexTemplate');
      });

      test('shows data retention detail when configured', async () => {
        const { actions, findDetailPanelDataRetentionDetail } = testBed;
        await actions.clickNameAt(0);
        expect(findDetailPanelDataRetentionDetail().exists()).toBeTruthy();
      });
    });

    describe('shows all possible states according to who manages the data stream', () => {
      const ds1 = createDataStreamPayload({
        name: 'dataStream1',
        nextGenerationManagedBy: 'Index Lifecycle Management',
        lifecycle: undefined,
        indices: [
          {
            managedBy: 'Index Lifecycle Management',
            name: 'indexName',
            uuid: 'indexId',
            preferILM: true,
          },
        ],
      });

      const ds2 = createDataStreamPayload({
        name: 'dataStream2',
        nextGenerationManagedBy: 'Data stream lifecycle',
        lifecycle: {
          enabled: true,
          data_retention: '7d',
        },
        indices: [
          {
            managedBy: 'Index Lifecycle Management',
            name: 'indexName1',
            uuid: 'indexId1',
            preferILM: true,
          },
          {
            managedBy: 'Index Lifecycle Management',
            name: 'indexName2',
            uuid: 'indexId2',
            preferILM: true,
          },
          {
            managedBy: 'Index Lifecycle Management',
            name: 'indexName3',
            uuid: 'indexId3',
            preferILM: true,
          },
          {
            managedBy: 'Index Lifecycle Management',
            name: 'indexName4',
            uuid: 'indexId4',
            preferILM: true,
          },
        ],
      });

      beforeEach(async () => {
        const { setLoadDataStreamsResponse } = httpRequestsMockHelpers;

        setLoadDataStreamsResponse([ds1, ds2]);

        testBed = await setup(httpSetup, {
          history: createMemoryHistory(),
          url: urlServiceMock,
        });

        await act(async () => {
          testBed.actions.goToDataStreamsList();
        });
        testBed.component.update();
      });

      test('when fully managed by ILM, user cannot edit data retention', async () => {
        const { setLoadDataStreamResponse } = httpRequestsMockHelpers;

        setLoadDataStreamResponse(ds1.name, ds1);

        const { actions, find, exists } = testBed;

        await actions.clickNameAt(0);
        expect(find('dataRetentionDetail').text()).toBe('Disabled');

        // There should be a warning that the data stream is fully managed by ILM
        expect(exists('dsIsFullyManagedByILM')).toBe(true);

        // Edit data retention button should not be visible
        testBed.find('manageDataStreamButton').simulate('click');
        expect(exists('editDataRetentionButton')).toBe(false);
      });

      test('when partially managed by dsl but has backing indices managed by ILM should show a warning', async () => {
        const { setLoadDataStreamResponse } = httpRequestsMockHelpers;

        setLoadDataStreamResponse(ds2.name, ds2);

        const { actions, find, exists } = testBed;

        await actions.clickNameAt(1);
        expect(find('dataRetentionDetail').text()).toBe('7 days');

        actions.clickEditDataRetentionButton();

        // There should be a warning that the data stream is managed by DSL
        // but the backing indices that are managed by ILM wont be affected.
        expect(exists('someIndicesAreManagedByILMCallout')).toBe(true);
        expect(exists('viewIlmPolicyLink')).toBe(true);
        expect(exists('viewAllIndicesLink')).toBe(true);
      });
    });
  });

  describe('when there are special characters', () => {
    beforeEach(async () => {
      const { setLoadIndicesResponse, setLoadDataStreamsResponse, setLoadDataStreamResponse } =
        httpRequestsMockHelpers;

      setLoadIndicesResponse([
        createDataStreamBackingIndex('data-stream-index', '%dataStream'),
        createDataStreamBackingIndex('data-stream-index2', 'dataStream2'),
      ]);

      const dataStreamPercentSign = createDataStreamPayload({ name: '%dataStream' });
      setLoadDataStreamsResponse([dataStreamPercentSign]);
      setLoadDataStreamResponse(dataStreamPercentSign.name, dataStreamPercentSign);

      testBed = await setup(httpSetup, {
        history: createMemoryHistory(),
        url: urlServiceMock,
      });
      await act(async () => {
        testBed.actions.goToDataStreamsList();
      });
      testBed.component.update();
    });

    describe('detail panel', () => {
      test('opens when the data stream name in the table is clicked', async () => {
        const { actions, findDetailPanel, findDetailPanelTitle } = testBed;
        await actions.clickNameAt(0);
        expect(findDetailPanel().length).toBe(1);
        expect(findDetailPanelTitle()).toBe('%dataStream');
      });

      test('clicking the indices count navigates to the backing indices', async () => {
        const { table, actions } = testBed;
        await actions.clickIndicesAt(0);
        expect(table.getMetaData('indexTable').tableCellsValues).toEqual([
          ['', 'data-stream-index', '', '', '', '', '0', '', '%dataStream'],
        ]);
      });
    });
  });

  describe('url locators', () => {
    test('with an ILM url locator and an ILM policy', async () => {
      const { setLoadDataStreamsResponse, setLoadDataStreamResponse } = httpRequestsMockHelpers;

      const dataStreamForDetailPanel = createDataStreamPayload({
        name: 'dataStream1',
        ilmPolicyName: 'my_ilm_policy',
      });

      setLoadDataStreamsResponse([dataStreamForDetailPanel]);
      setLoadDataStreamResponse(dataStreamForDetailPanel.name, dataStreamForDetailPanel);

      testBed = await setup(httpSetup, {
        history: createMemoryHistory(),
        url: urlServiceMock,
      });
      await act(async () => {
        testBed.actions.goToDataStreamsList();
      });
      testBed.component.update();

      const { actions, findDetailPanelIlmPolicyLink } = testBed;
      await actions.clickNameAt(0);
      expect(findDetailPanelIlmPolicyLink().prop('data-href')).toBe('/test/my_ilm_policy');
    });

    test('with an ILM url locator and no ILM policy', async () => {
      const { setLoadDataStreamsResponse, setLoadDataStreamResponse } = httpRequestsMockHelpers;

      const dataStreamForDetailPanel = createDataStreamPayload({ name: 'dataStream1' });

      setLoadDataStreamsResponse([dataStreamForDetailPanel]);
      setLoadDataStreamResponse(dataStreamForDetailPanel.name, dataStreamForDetailPanel);

      testBed = await setup(httpSetup, {
        history: createMemoryHistory(),
        url: urlServiceMock,
      });
      await act(async () => {
        testBed.actions.goToDataStreamsList();
      });
      testBed.component.update();

      const { actions, findDetailPanelIlmPolicyLink, findDetailPanelIlmPolicyDetail } = testBed;
      await actions.clickNameAt(0);
      expect(findDetailPanelIlmPolicyLink().exists()).toBeFalsy();
      expect(findDetailPanelIlmPolicyDetail().exists()).toBeFalsy();
    });

    test('without an ILM url locator and with an ILM policy', async () => {
      const { setLoadDataStreamsResponse, setLoadDataStreamResponse } = httpRequestsMockHelpers;

      const dataStreamForDetailPanel = createDataStreamPayload({
        name: 'dataStream1',
        ilmPolicyName: 'my_ilm_policy',
      });

      setLoadDataStreamsResponse([dataStreamForDetailPanel]);
      setLoadDataStreamResponse(dataStreamForDetailPanel.name, dataStreamForDetailPanel);

      testBed = await setup(httpSetup, {
        history: createMemoryHistory(),
        url: {
          locators: {
            get: () => undefined,
          },
        },
      });
      await act(async () => {
        testBed.actions.goToDataStreamsList();
      });
      testBed.component.update();

      const { actions, findDetailPanelIlmPolicyLink, findDetailPanelIlmPolicyDetail } = testBed;
      await actions.clickNameAt(0);
      expect(findDetailPanelIlmPolicyLink().exists()).toBeFalsy();
      expect(findDetailPanelIlmPolicyDetail().contains('my_ilm_policy')).toBeTruthy();
    });
  });

  describe('managed data streams', () => {
    beforeEach(async () => {
      const managedDataStream = createDataStreamPayload({
        name: 'managed-data-stream',
        _meta: {
          package: 'test',
          managed: true,
          managed_by: 'fleet',
        },
      });
      const nonManagedDataStream = createDataStreamPayload({ name: 'non-managed-data-stream' });

      httpRequestsMockHelpers.setLoadDataStreamsResponse([managedDataStream, nonManagedDataStream]);

      testBed = await setup(httpSetup, {
        history: createMemoryHistory(),
        url: urlServiceMock,
      });
      await act(async () => {
        testBed.actions.goToDataStreamsList();
      });
      testBed.component.update();
    });

    test('listed in the table with managed label', () => {
      const { table } = testBed;
      const { tableCellsValues } = table.getMetaData('dataStreamTable');

      expect(tableCellsValues).toEqual([
        [
          '',
          `managed-data-stream${nonBreakingSpace}Managed`,
          'green',
          '1',
          'Standard',
          '7 days',
          'Delete',
        ],
        ['', 'non-managed-data-stream', 'green', '1', 'Standard', '7 days', 'Delete'],
      ]);
    });

    test('turning off "managed" filter hides managed data streams', async () => {
      const { actions, table } = testBed;
      let { tableCellsValues } = table.getMetaData('dataStreamTable');

      expect(tableCellsValues).toEqual([
        [
          '',
          `managed-data-stream${nonBreakingSpace}Managed`,
          'green',
          '1',
          'Standard',
          '7 days',
          'Delete',
        ],
        ['', 'non-managed-data-stream', 'green', '1', 'Standard', '7 days', 'Delete'],
      ]);

      actions.toggleViewFilterAt(0);

      ({ tableCellsValues } = table.getMetaData('dataStreamTable'));
      expect(tableCellsValues).toEqual([
        ['', 'non-managed-data-stream', 'green', '1', 'Standard', '7 days', 'Delete'],
      ]);
    });
  });

  describe('hidden data streams', () => {
    beforeEach(async () => {
      const hiddenDataStream = createDataStreamPayload({
        name: 'hidden-data-stream',
        hidden: true,
      });

      httpRequestsMockHelpers.setLoadDataStreamsResponse([hiddenDataStream]);

      testBed = await setup(httpSetup, {
        history: createMemoryHistory(),
        url: urlServiceMock,
      });
      await act(async () => {
        testBed.actions.goToDataStreamsList();
      });
      testBed.component.update();
    });

    test('show hidden data streams when filter is toggled', () => {
      const { table, actions } = testBed;

      actions.toggleViewFilterAt(1);

      const { tableCellsValues } = table.getMetaData('dataStreamTable');

      expect(tableCellsValues).toEqual([
        [
          '',
          `hidden-data-stream${nonBreakingSpace}Hidden`,
          'green',
          '1',
          'Standard',
          '7 days',
          'Delete',
        ],
      ]);
    });
  });

  describe('data stream privileges', () => {
    describe('delete', () => {
      const { setLoadDataStreamsResponse, setLoadDataStreamResponse } = httpRequestsMockHelpers;

      const dataStreamWithDelete = createDataStreamPayload({
        name: 'dataStreamWithDelete',
        privileges: { delete_index: true, manage_data_stream_lifecycle: true },
      });
      const dataStreamNoDelete = createDataStreamPayload({
        name: 'dataStreamNoDelete',
        privileges: { delete_index: false, manage_data_stream_lifecycle: true },
      });
      const dataStreamNoEditRetention = createDataStreamPayload({
        name: 'dataStreamNoEditRetention',
        privileges: { delete_index: true, manage_data_stream_lifecycle: false },
      });

      const dataStreamNoPermissions = createDataStreamPayload({
        name: 'dataStreamNoPermissions',
        privileges: { delete_index: false, manage_data_stream_lifecycle: false },
      });

      beforeEach(async () => {
        setLoadDataStreamsResponse([
          dataStreamWithDelete,
          dataStreamNoDelete,
          dataStreamNoEditRetention,
          dataStreamNoPermissions,
        ]);

        testBed = await setup(httpSetup, { history: createMemoryHistory(), url: urlServiceMock });
        await act(async () => {
          testBed.actions.goToDataStreamsList();
        });
        testBed.component.update();
      });

      test('displays/hides delete button depending on data streams privileges', async () => {
        const { table } = testBed;
        const { tableCellsValues } = table.getMetaData('dataStreamTable');

        expect(tableCellsValues).toEqual([
          ['', 'dataStreamNoDelete', 'green', '1', 'Standard', '7 days', ''],
          ['', 'dataStreamNoEditRetention', 'green', '1', 'Standard', '7 days', 'Delete'],
          ['', 'dataStreamNoPermissions', 'green', '1', 'Standard', '7 days', ''],
          ['', 'dataStreamWithDelete', 'green', '1', 'Standard', '7 days', 'Delete'],
        ]);
      });

      test('displays/hides delete action depending on data streams privileges', async () => {
        const {
          actions: { selectDataStream },
          find,
        } = testBed;

        selectDataStream('dataStreamNoDelete', true);
        expect(find('deleteDataStreamsButton').exists()).toBeFalsy();

        selectDataStream('dataStreamWithDelete', true);
        expect(find('deleteDataStreamsButton').exists()).toBeFalsy();

        selectDataStream('dataStreamNoDelete', false);
        expect(find('deleteDataStreamsButton').exists()).toBeTruthy();
      });

      test('hides delete button in detail panel', async () => {
        const {
          actions: { clickNameAt },
          find,
        } = testBed;
        setLoadDataStreamResponse(dataStreamNoDelete.name, dataStreamNoDelete);
        await clickNameAt(0);

        testBed.find('manageDataStreamButton').simulate('click');
        expect(find('deleteDataStreamButton').exists()).toBeFalsy();
      });

      test('hides edit data retention button if no permissions', async () => {
        const {
          actions: { clickNameAt },
          find,
        } = testBed;
        setLoadDataStreamResponse(dataStreamNoEditRetention.name, dataStreamNoEditRetention);
        await clickNameAt(1);

        testBed.find('manageDataStreamButton').simulate('click');
        expect(find('editDataRetentionButton').exists()).toBeFalsy();
      });

      test('hides manage button if no permissions', async () => {
        const {
          actions: { clickNameAt },
          find,
        } = testBed;
        setLoadDataStreamResponse(dataStreamNoPermissions.name, dataStreamNoPermissions);
        await clickNameAt(2);

        expect(find('manageDataStreamButton').exists()).toBeFalsy();
      });

      test('displays delete button in detail panel', async () => {
        const {
          actions: { clickNameAt },
          find,
        } = testBed;
        setLoadDataStreamResponse(dataStreamWithDelete.name, dataStreamWithDelete);
        await clickNameAt(3);

        testBed.find('manageDataStreamButton').simulate('click');
        expect(find('deleteDataStreamButton').exists()).toBeTruthy();
      });
    });
  });
});

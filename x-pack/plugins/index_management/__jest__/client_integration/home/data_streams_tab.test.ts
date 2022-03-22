/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { createMemoryHistory } from 'history';

import { API_BASE_PATH } from '../../../common/constants';
import * as fixtures from '../../../test/fixtures';
import { setupEnvironment } from '../helpers';

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

    test('when Ingest Manager is disabled, goes to index templates tab when "Get started" link is clicked', async () => {
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
  });

  describe('when there are data streams', () => {
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
      });

      setLoadDataStreamsResponse([
        dataStreamForDetailPanel,
        createDataStreamPayload({
          name: 'dataStream2',
          storageSize: '1kb',
          storageSizeBytes: 1000,
        }),
      ]);

      setLoadDataStreamResponse(dataStreamForDetailPanel.name, dataStreamForDetailPanel);

      const indexTemplate = fixtures.getTemplate({ name: 'indexTemplate' });
      setLoadTemplatesResponse({ templates: [indexTemplate], legacyTemplates: [] });
      setLoadTemplateResponse(indexTemplate.name, indexTemplate);

      testBed = await setup(httpSetup, { history: createMemoryHistory() });
      await act(async () => {
        testBed.actions.goToDataStreamsList();
      });
      testBed.component.update();
    });

    test('lists them in the table', async () => {
      const { table } = testBed;
      const { tableCellsValues } = table.getMetaData('dataStreamTable');

      expect(tableCellsValues).toEqual([
        ['', 'dataStream1', 'green', '1', 'Delete'],
        ['', 'dataStream2', 'green', '1', 'Delete'],
      ]);
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
      const { exists, actions, table, component } = testBed;

      expect(exists('includeStatsSwitch')).toBe(true);

      // Changing the switch will automatically reload the data streams.
      await act(async () => {
        actions.clickIncludeStatsSwitch();
      });
      component.update();

      expect(httpSetup.get).toHaveBeenLastCalledWith(
        `${API_BASE_PATH}/data_streams`,
        expect.anything()
      );

      // The table renders with the stats columns though.
      const { tableCellsValues } = table.getMetaData('dataStreamTable');
      expect(tableCellsValues).toEqual([
        ['', 'dataStream1', 'green', 'December 31st, 1969 7:00:00 PM', '5b', '1', 'Delete'],
        ['', 'dataStream2', 'green', 'December 31st, 1969 7:00:00 PM', '1kb', '1', 'Delete'],
      ]);
    });

    test('sorting on stats sorts by bytes value instead of human readable value', async () => {
      // Guards against regression of #86122.
      const { actions, table, component } = testBed;

      await act(async () => {
        actions.clickIncludeStatsSwitch();
      });
      component.update();

      actions.sortTableOnStorageSize();

      // The table sorts by the underlying byte values in ascending order, instead of sorting by
      // the human-readable string values.
      const { tableCellsValues } = table.getMetaData('dataStreamTable');
      expect(tableCellsValues).toEqual([
        ['', 'dataStream1', 'green', 'December 31st, 1969 7:00:00 PM', '5b', '1', 'Delete'],
        ['', 'dataStream2', 'green', 'December 31st, 1969 7:00:00 PM', '1kb', '1', 'Delete'],
      ]);
    });

    test('clicking the indices count navigates to the backing indices', async () => {
      const { table, actions } = testBed;
      await actions.clickIndicesAt(0);
      expect(table.getMetaData('indexTable').tableCellsValues).toEqual([
        ['', '', '', '', '', '', '', 'dataStream1'],
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
        ['', '', '', '', '', '', '', '%dataStream'],
      ]);
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
      expect(findDetailPanelIlmPolicyLink().prop('href')).toBe('/test/my_ilm_policy');
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

      const { actions, findDetailPanelIlmPolicyLink, findDetailPanelIlmPolicyName } = testBed;
      await actions.clickNameAt(0);
      expect(findDetailPanelIlmPolicyLink().exists()).toBeFalsy();
      expect(findDetailPanelIlmPolicyName().contains('None')).toBeTruthy();
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

      const { actions, findDetailPanelIlmPolicyLink, findDetailPanelIlmPolicyName } = testBed;
      await actions.clickNameAt(0);
      expect(findDetailPanelIlmPolicyLink().exists()).toBeFalsy();
      expect(findDetailPanelIlmPolicyName().contains('my_ilm_policy')).toBeTruthy();
    });
  });

  describe('managed data streams', () => {
    beforeEach(async () => {
      const managedDataStream = createDataStreamPayload({
        name: 'managed-data-stream',
        _meta: {
          package: 'test',
          managed: true,
          managed_by: 'ingest-manager',
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

    test('listed in the table with Fleet-managed label', () => {
      const { table } = testBed;
      const { tableCellsValues } = table.getMetaData('dataStreamTable');

      expect(tableCellsValues).toEqual([
        ['', `managed-data-stream${nonBreakingSpace}Fleet-managed`, 'green', '1', 'Delete'],
        ['', 'non-managed-data-stream', 'green', '1', 'Delete'],
      ]);
    });

    test('turning off "managed" filter hides managed data streams', async () => {
      const { actions, table } = testBed;
      let { tableCellsValues } = table.getMetaData('dataStreamTable');

      expect(tableCellsValues).toEqual([
        ['', `managed-data-stream${nonBreakingSpace}Fleet-managed`, 'green', '1', 'Delete'],
        ['', 'non-managed-data-stream', 'green', '1', 'Delete'],
      ]);

      actions.toggleViewFilterAt(0);

      ({ tableCellsValues } = table.getMetaData('dataStreamTable'));
      expect(tableCellsValues).toEqual([['', 'non-managed-data-stream', 'green', '1', 'Delete']]);
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
        ['', `hidden-data-stream${nonBreakingSpace}Hidden`, 'green', '1', 'Delete'],
      ]);
    });
  });

  describe('data stream privileges', () => {
    describe('delete', () => {
      const { setLoadDataStreamsResponse, setLoadDataStreamResponse } = httpRequestsMockHelpers;

      const dataStreamWithDelete = createDataStreamPayload({
        name: 'dataStreamWithDelete',
        privileges: { delete_index: true },
      });
      const dataStreamNoDelete = createDataStreamPayload({
        name: 'dataStreamNoDelete',
        privileges: { delete_index: false },
      });

      beforeEach(async () => {
        setLoadDataStreamsResponse([dataStreamWithDelete, dataStreamNoDelete]);

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
          ['', 'dataStreamNoDelete', 'green', '1', ''],
          ['', 'dataStreamWithDelete', 'green', '1', 'Delete'],
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

      test('displays delete button in detail panel', async () => {
        const {
          actions: { clickNameAt },
          find,
        } = testBed;
        setLoadDataStreamResponse(dataStreamWithDelete.name, dataStreamWithDelete);
        await clickNameAt(1);

        expect(find('deleteDataStreamButton').exists()).toBeTruthy();
      });

      test('hides delete button in detail panel', async () => {
        const {
          actions: { clickNameAt },
          find,
        } = testBed;
        setLoadDataStreamResponse(dataStreamNoDelete.name, dataStreamNoDelete);
        await clickNameAt(0);

        expect(find('deleteDataStreamButton').exists()).toBeFalsy();
      });
    });
  });
});

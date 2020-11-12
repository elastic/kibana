/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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

describe('Data Streams tab', () => {
  const { server, httpRequestsMockHelpers } = setupEnvironment();
  let testBed: DataStreamsTabTestBed;

  afterAll(() => {
    server.restore();
  });

  describe('when there are no data streams', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadIndicesResponse([]);
      httpRequestsMockHelpers.setLoadDataStreamsResponse([]);
      httpRequestsMockHelpers.setLoadTemplatesResponse({ templates: [], legacyTemplates: [] });
    });

    test('displays an empty prompt', async () => {
      testBed = await setup();

      await act(async () => {
        testBed.actions.goToDataStreamsList();
      });

      const { exists, component } = testBed;
      component.update();

      expect(exists('sectionLoading')).toBe(false);
      expect(exists('emptyPrompt')).toBe(true);
    });

    test('when Ingest Manager is disabled, goes to index templates tab when "Get started" link is clicked', async () => {
      testBed = await setup({
        plugins: {},
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
      testBed = await setup({
        plugins: { fleet: { hi: 'ok' } },
      });

      await act(async () => {
        testBed.actions.goToDataStreamsList();
      });

      const { findEmptyPromptIndexTemplateLink, component } = testBed;
      component.update();

      // Assert against the text because the href won't be available, due to dependency upon our core mock.
      expect(findEmptyPromptIndexTemplateLink().text()).toBe('Fleet');
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

      const dataStreamForDetailPanel = createDataStreamPayload('dataStream1');
      setLoadDataStreamsResponse([
        dataStreamForDetailPanel,
        createDataStreamPayload('dataStream2'),
      ]);
      setLoadDataStreamResponse(dataStreamForDetailPanel);

      const indexTemplate = fixtures.getTemplate({ name: 'indexTemplate' });
      setLoadTemplatesResponse({ templates: [indexTemplate], legacyTemplates: [] });
      setLoadTemplateResponse(indexTemplate);

      testBed = await setup({ history: createMemoryHistory() });
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
      const totalRequests = server.requests.length;

      expect(exists('reloadButton')).toBe(true);

      await act(async () => {
        actions.clickReloadButton();
      });

      expect(server.requests.length).toBe(totalRequests + 1);
      expect(server.requests[server.requests.length - 1].url).toBe(`${API_BASE_PATH}/data_streams`);
    });

    test('has a switch that will reload the data streams with additional stats when clicked', async () => {
      const { exists, actions, table, component } = testBed;
      const totalRequests = server.requests.length;

      expect(exists('includeStatsSwitch')).toBe(true);

      // Changing the switch will automatically reload the data streams.
      await act(async () => {
        actions.clickIncludeStatsSwitch();
      });
      component.update();

      // A request is sent, but sinon isn't capturing the query parameters for some reason.
      expect(server.requests.length).toBe(totalRequests + 1);
      expect(server.requests[server.requests.length - 1].url).toBe(`${API_BASE_PATH}/data_streams`);

      // The table renders with the stats columns though.
      const { tableCellsValues } = table.getMetaData('dataStreamTable');
      expect(tableCellsValues).toEqual([
        ['', 'dataStream1', 'green', 'December 31st, 1969 7:00:00 PM', '1b', '1', 'Delete'],
        ['', 'dataStream2', 'green', 'December 31st, 1969 7:00:00 PM', '1b', '1', 'Delete'],
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

        const { method, url, requestBody } = server.requests[server.requests.length - 1];

        expect(method).toBe('POST');
        expect(url).toBe(`${API_BASE_PATH}/delete_data_streams`);
        expect(JSON.parse(JSON.parse(requestBody).body)).toEqual({
          dataStreams: ['dataStream1'],
        });
      });
    });

    describe('detail panel', () => {
      test('opens when the data stream name in the table is clicked', async () => {
        const { actions, findDetailPanel, findDetailPanelTitle } = testBed;
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

        const { method, url, requestBody } = server.requests[server.requests.length - 1];

        expect(method).toBe('POST');
        expect(url).toBe(`${API_BASE_PATH}/delete_data_streams`);
        expect(JSON.parse(JSON.parse(requestBody).body)).toEqual({
          dataStreams: ['dataStream1'],
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
    });
  });

  describe('when there are special characters', () => {
    beforeEach(async () => {
      const {
        setLoadIndicesResponse,
        setLoadDataStreamsResponse,
        setLoadDataStreamResponse,
      } = httpRequestsMockHelpers;

      setLoadIndicesResponse([
        createDataStreamBackingIndex('data-stream-index', '%dataStream'),
        createDataStreamBackingIndex('data-stream-index2', 'dataStream2'),
      ]);

      const dataStreamDollarSign = createDataStreamPayload('%dataStream');
      setLoadDataStreamsResponse([dataStreamDollarSign]);
      setLoadDataStreamResponse(dataStreamDollarSign);

      testBed = await setup({
        history: createMemoryHistory(),
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
          ['', '', '', '', '', '', '', '%dataStream'],
        ]);
      });
    });
  });

  describe('url generators', () => {
    const mockIlmUrlGenerator = {
      getUrlGenerator: () => ({
        createUrl: ({ policyName }: { policyName: string }) => `/test/${policyName}`,
      }),
    };
    test('with an ILM url generator and an ILM policy', async () => {
      const { setLoadDataStreamsResponse, setLoadDataStreamResponse } = httpRequestsMockHelpers;

      const dataStreamForDetailPanel = {
        ...createDataStreamPayload('dataStream1'),
        ilmPolicyName: 'my_ilm_policy',
      };
      setLoadDataStreamsResponse([dataStreamForDetailPanel]);
      setLoadDataStreamResponse(dataStreamForDetailPanel);

      testBed = await setup({
        history: createMemoryHistory(),
        urlGenerators: mockIlmUrlGenerator,
      });
      await act(async () => {
        testBed.actions.goToDataStreamsList();
      });
      testBed.component.update();

      const { actions, findDetailPanelIlmPolicyLink } = testBed;
      await actions.clickNameAt(0);
      expect(findDetailPanelIlmPolicyLink().prop('href')).toBe('/test/my_ilm_policy');
    });

    test('with an ILM url generator and no ILM policy', async () => {
      const { setLoadDataStreamsResponse, setLoadDataStreamResponse } = httpRequestsMockHelpers;

      const dataStreamForDetailPanel = createDataStreamPayload('dataStream1');
      setLoadDataStreamsResponse([dataStreamForDetailPanel]);
      setLoadDataStreamResponse(dataStreamForDetailPanel);

      testBed = await setup({
        history: createMemoryHistory(),
        urlGenerators: mockIlmUrlGenerator,
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

    test('without an ILM url generator and with an ILM policy', async () => {
      const { setLoadDataStreamsResponse, setLoadDataStreamResponse } = httpRequestsMockHelpers;

      const dataStreamForDetailPanel = {
        ...createDataStreamPayload('dataStream1'),
        ilmPolicyName: 'my_ilm_policy',
      };
      setLoadDataStreamsResponse([dataStreamForDetailPanel]);
      setLoadDataStreamResponse(dataStreamForDetailPanel);

      testBed = await setup({
        history: createMemoryHistory(),
        urlGenerators: { getUrlGenerator: () => {} },
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
});

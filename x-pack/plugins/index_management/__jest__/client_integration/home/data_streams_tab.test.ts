/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act } from 'react-dom/test-utils';

import { API_BASE_PATH } from '../../../common/constants';
import { setupEnvironment } from '../helpers';

import { DataStreamsTabTestBed, setup, createDataStreamPayload } from './data_streams_tab.helpers';

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

    test('when Ingest Manager is enabled, links to Ingest Manager', async () => {
      testBed = await setup({
        plugins: { ingestManager: { hi: 'ok' } },
      });

      await act(async () => {
        testBed.actions.goToDataStreamsList();
      });

      const { findEmptyPromptIndexTemplateLink, component } = testBed;
      component.update();

      // Assert against the text because the href won't be available, due to dependency upon our core mock.
      expect(findEmptyPromptIndexTemplateLink().text()).toBe('Ingest Manager');
    });
  });

  describe('when there are data streams', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadIndicesResponse([
        {
          health: '',
          status: '',
          primary: '',
          replica: '',
          documents: '',
          documents_deleted: '',
          size: '',
          primary_size: '',
          name: 'data-stream-index',
          data_stream: 'dataStream1',
        },
        {
          health: 'green',
          status: 'open',
          primary: 1,
          replica: 1,
          documents: 10000,
          documents_deleted: 100,
          size: '156kb',
          primary_size: '156kb',
          name: 'non-data-stream-index',
        },
      ]);

      const dataStreamForDetailPanel = createDataStreamPayload('dataStream1');

      httpRequestsMockHelpers.setLoadDataStreamsResponse([
        dataStreamForDetailPanel,
        createDataStreamPayload('dataStream2'),
      ]);

      httpRequestsMockHelpers.setLoadDataStreamResponse(dataStreamForDetailPanel);

      testBed = await setup();

      await act(async () => {
        testBed.actions.goToDataStreamsList();
      });

      testBed.component.update();
    });

    test('lists them in the table', async () => {
      const { table } = testBed;
      const { tableCellsValues } = table.getMetaData('dataStreamTable');

      expect(tableCellsValues).toEqual([
        ['', 'dataStream1', '1', 'Delete'],
        ['', 'dataStream2', '1', 'Delete'],
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
          actions: { clickDeletActionAt },
          findDeleteConfirmationModal,
        } = testBed;
        clickDeletActionAt(0);
        const confirmationModal = findDeleteConfirmationModal();
        expect(confirmationModal).toBeDefined();
      });

      test('sends a request to the Delete API', async () => {
        const {
          actions: { clickDeletActionAt, clickConfirmDelete },
        } = testBed;
        clickDeletActionAt(0);

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
          actions: { clickNameAt, clickDeletDataStreamButton, clickConfirmDelete },
        } = testBed;

        await clickNameAt(0);

        clickDeletDataStreamButton();

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
  });
});

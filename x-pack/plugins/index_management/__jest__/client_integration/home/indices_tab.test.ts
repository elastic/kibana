/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { API_BASE_PATH } from '../../../common/constants';
import { setupEnvironment, nextTick } from '../helpers';
import { IndicesTestBed, setup } from './indices_tab.helpers';
import { createDataStreamPayload } from './data_streams/data_streams_tab.helpers';

/**
 * The below import is required to avoid a console error warn from the "brace" package
 * console.warn ../node_modules/brace/index.js:3999
      Could not load worker ReferenceError: Worker is not defined
          at createWorker (/<path-to-repo>/node_modules/brace/index.js:17992:5)
 */
import { stubWebWorker } from '@kbn/test/jest';
import { createMemoryHistory } from 'history';
stubWebWorker();

describe('<IndexManagementHome />', () => {
  const { server, httpRequestsMockHelpers } = setupEnvironment();
  let testBed: IndicesTestBed;

  afterAll(() => {
    server.restore();
  });

  describe('on component mount', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadIndicesResponse([]);

      testBed = await setup();

      await act(async () => {
        const { component } = testBed;

        await nextTick();
        component.update();
      });
    });

    test('toggles the include hidden button through URL hash correctly', () => {
      const { actions } = testBed;
      expect(actions.getIncludeHiddenIndicesToggleStatus()).toBe(true);
      actions.clickIncludeHiddenIndicesToggle();
      expect(actions.getIncludeHiddenIndicesToggleStatus()).toBe(false);
      // Note: this test modifies the shared location.hash state, we put it back the way it was
      actions.clickIncludeHiddenIndicesToggle();
      expect(actions.getIncludeHiddenIndicesToggleStatus()).toBe(true);
    });
  });

  describe('data stream column', () => {
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
      ]);

      // The detail panel should still appear even if there are no data streams.
      httpRequestsMockHelpers.setLoadDataStreamsResponse([]);

      httpRequestsMockHelpers.setLoadDataStreamResponse(
        createDataStreamPayload({ name: 'dataStream1' })
      );

      testBed = await setup({
        history: createMemoryHistory(),
      });

      await act(async () => {
        const { component } = testBed;

        await nextTick();
        component.update();
      });
    });

    test('navigates to the data stream in the Data Streams tab', async () => {
      const {
        findDataStreamDetailPanel,
        findDataStreamDetailPanelTitle,
        actions: { clickDataStreamAt },
      } = testBed;

      await clickDataStreamAt(0);

      expect(findDataStreamDetailPanel().length).toBe(1);
      expect(findDataStreamDetailPanelTitle()).toBe('dataStream1');
    });
  });

  describe('toggle system indices', () => {
    beforeAll(async () => {
      const systemIndex = {
        health: 'green',
        status: 'open',
        name: 'testSystemIndex',
        uuid: 'AToRD7lATjKLDV3BYvywtQ',
        primary: '1',
        replica: '0',
        documents: '3',
        size: '17.7kb',
        isFrozen: false,
        aliases: [],
        hidden: true,
        ilm: {},
        isRollupIndex: false,
        isFollowerIndex: false,
      };

      httpRequestsMockHelpers.setLoadIndicesResponse([systemIndex]);

      testBed = await setup();
      const { component } = testBed;

      await act(async () => {
        await nextTick();
        component.update();
      });
    });

    test('Should show system indices if hidden indices is toggled. ', async () => {
      // Hidden indices are visible by default due to configuration.
      const { find, actions, component } = testBed;

      const indicesListTable = find('indicesList');
      const indicesTableRows = indicesListTable.find('.euiTableRow');

      const indexName = indicesTableRows.find('[data-test-subj="indexTableCell-name"]').text();

      expect(indicesTableRows.length).toEqual(1);
      expect(indexName).toBe('testSystemIndex');

      // Toggle to hide system indices.
      await act(async () => {
        actions.clickIncludeHiddenIndicesToggle();
      });
      component.update();

      // Check the updated table after the toggle has been clicked.
      const updatedIndicesListTable = find('indicesList');
      const updatedIndicesTableRows = updatedIndicesListTable.find('.euiTableRow');
      const noIndicesMessageText = updatedIndicesListTable
        .find('[data-test-subj="noIndicesMessage"]')
        .text();

      expect(updatedIndicesTableRows.length).toEqual(0);
      expect(noIndicesMessageText).toEqual('No indices to show');
    });
  });

  describe('index detail panel with % character in index name', () => {
    const indexName = 'test%';
    beforeEach(async () => {
      const index = {
        health: 'green',
        status: 'open',
        primary: 1,
        replica: 1,
        documents: 10000,
        documents_deleted: 100,
        size: '156kb',
        primary_size: '156kb',
        name: indexName,
      };
      httpRequestsMockHelpers.setLoadIndicesResponse([index]);

      testBed = await setup();
      const { component, find } = testBed;

      component.update();

      find('indexTableIndexNameLink').at(0).simulate('click');
    });

    test('should encode indexName when loading settings in detail panel', async () => {
      const { actions } = testBed;
      await actions.selectIndexDetailsTab('settings');

      const latestRequest = server.requests[server.requests.length - 1];
      expect(latestRequest.url).toBe(`${API_BASE_PATH}/settings/${encodeURIComponent(indexName)}`);
    });

    test('should encode indexName when loading mappings in detail panel', async () => {
      const { actions } = testBed;
      await actions.selectIndexDetailsTab('mappings');

      const latestRequest = server.requests[server.requests.length - 1];
      expect(latestRequest.url).toBe(`${API_BASE_PATH}/mapping/${encodeURIComponent(indexName)}`);
    });

    test('should encode indexName when loading stats in detail panel', async () => {
      const { actions } = testBed;
      await actions.selectIndexDetailsTab('stats');

      const latestRequest = server.requests[server.requests.length - 1];
      expect(latestRequest.url).toBe(`${API_BASE_PATH}/stats/${encodeURIComponent(indexName)}`);
    });

    test('should encode indexName when editing settings in detail panel', async () => {
      const { actions } = testBed;
      await actions.selectIndexDetailsTab('edit_settings');

      const latestRequest = server.requests[server.requests.length - 1];
      expect(latestRequest.url).toBe(`${API_BASE_PATH}/settings/${encodeURIComponent(indexName)}`);
    });
  });

  describe('index detail panel actions', () => {
    const indexName = 'testIndex';
    beforeEach(async () => {
      const index = {
        health: 'green',
        status: 'open',
        primary: 1,
        replica: 1,
        documents: 10000,
        documents_deleted: 100,
        size: '156kb',
        primary_size: '156kb',
        name: indexName,
      };
      httpRequestsMockHelpers.setLoadIndicesResponse([index]);

      testBed = await setup();
      const { component, find } = testBed;

      component.update();

      find('indexTableIndexNameLink').at(0).simulate('click');
    });

    test('should be able to close index', async () => {
      const { find, actions, component } = testBed;

      actions.clickManageContextMenuButton();
      const contextMenu = find('indexContextMenu');

      const closeIndexButton = contextMenu
        .childAt(0)
        .childAt(0)
        .childAt(1)
        .childAt(0)
        .find('button[data-test-subj="indexTableContextMenuButton_closeindex"]');

      await act(async () => {
        closeIndexButton.simulate('click');
        nextTick();
      });
      component.update();

      // Request is second to last request because indices are reloaded after the close call.
      const latestRequest = server.requests[server.requests.length - 2];
      expect(latestRequest.url).toBe(`${API_BASE_PATH}/indices/close`);
    });
  });
});

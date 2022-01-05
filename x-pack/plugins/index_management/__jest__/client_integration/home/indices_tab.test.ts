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
import { createDataStreamPayload, createNonDataStreamIndex } from './data_streams_tab.helpers';

// Since the editor component being used for editing index settings is not a React
// component but an editor being instantiated on a div reference, we cannot mock
// the component and replace it with something else. In this particular case we're
// mocking the returned instance of the editor to always have the same values.
const mockGetAceEditorValue = jest.fn().mockReturnValue(`{}`);

jest.mock('../../../public/application/lib/ace.js', () => {
  const createAceEditor = () => {
    return {
      getValue: mockGetAceEditorValue,
      getSession: () => {
        return {
          on: () => null,
          getValue: () => null,
        };
      },
      destroy: () => null,
    };
  };

  return {
    createAceEditor,
  };
});

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
  let testBed: IndicesTestBed;
  let server: ReturnType<typeof setupEnvironment>['server'];
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];

  beforeEach(() => {
    ({ server, httpRequestsMockHelpers } = setupEnvironment());
  });

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

  describe('index detail panel with % character in index name', () => {
    const indexName = 'test%';

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadIndicesResponse([createNonDataStreamIndex(indexName)]);

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

  describe('index actions', () => {
    const indexNameA = 'testIndexA';
    const indexNameB = 'testIndexB';
    const indexMockA = createNonDataStreamIndex(indexNameA);
    const indexMockB = createNonDataStreamIndex(indexNameB);

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadIndicesResponse([
        {
          ...indexMockA,
          isFrozen: true,
        },
        {
          ...indexMockB,
          status: 'closed',
        },
      ]);
      httpRequestsMockHelpers.setReloadIndicesResponse({ indexNames: [indexNameA, indexNameB] });

      testBed = await setup();
      const { component, find } = testBed;

      component.update();

      find('indexTableIndexNameLink').at(0).simulate('click');
    });

    test('should be able to refresh index', async () => {
      const { actions } = testBed;

      await actions.clickManageContextMenuButton();
      await actions.clickContextMenuOption('refreshIndexMenuButton');

      const latestRequest = server.requests[server.requests.length - 2];
      expect(latestRequest.url).toBe(`${API_BASE_PATH}/indices/refresh`);
    });

    test('should be able to close an open index', async () => {
      const { actions } = testBed;

      await actions.clickManageContextMenuButton();
      await actions.clickContextMenuOption('closeIndexMenuButton');

      // A refresh call was added after closing an index so we need to check the second to last request.
      const latestRequest = server.requests[server.requests.length - 2];
      expect(latestRequest.url).toBe(`${API_BASE_PATH}/indices/close`);
    });

    test('should be able to open a closed index', async () => {
      testBed = await setup();
      const { component, find, actions } = testBed;

      component.update();

      find('indexTableIndexNameLink').at(1).simulate('click');

      await actions.clickManageContextMenuButton();
      await actions.clickContextMenuOption('openIndexMenuButton');

      // A refresh call was added after closing an index so we need to check the second to last request.
      const latestRequest = server.requests[server.requests.length - 2];
      expect(latestRequest.url).toBe(`${API_BASE_PATH}/indices/open`);
    });

    test('should be able to flush index', async () => {
      const { actions } = testBed;

      await actions.clickManageContextMenuButton();
      await actions.clickContextMenuOption('flushIndexMenuButton');

      const requestsCount = server.requests.length;
      expect(server.requests[requestsCount - 2].url).toBe(`${API_BASE_PATH}/indices/flush`);
      // After the indices are flushed, we imediately reload them. So we need to expect to see
      // a reload server call also.
      expect(server.requests[requestsCount - 1].url).toBe(`${API_BASE_PATH}/indices/reload`);
    });

    test("should be able to clear an index's cache", async () => {
      const { actions } = testBed;
      await actions.clickManageContextMenuButton();

      await actions.clickManageContextMenuButton();
      await actions.clickContextMenuOption('clearCacheIndexMenuButton');

      const latestRequest = server.requests[server.requests.length - 2];
      expect(latestRequest.url).toBe(`${API_BASE_PATH}/indices/clear_cache`);
    });

    test('should be able to unfreeze a frozen index', async () => {
      const { actions, exists } = testBed;

      httpRequestsMockHelpers.setReloadIndicesResponse([{ ...indexMockA, isFrozen: false }]);

      // Open context menu
      await actions.clickManageContextMenuButton();
      // Check that the unfreeze action exists for the current index and unfreeze it
      expect(exists('unfreezeIndexMenuButton')).toBe(true);
      await actions.clickContextMenuOption('unfreezeIndexMenuButton');

      const requestsCount = server.requests.length;
      expect(server.requests[requestsCount - 2].url).toBe(`${API_BASE_PATH}/indices/unfreeze`);
      // After the index is unfrozen, we imediately do a reload. So we need to expect to see
      // a reload server call also.
      expect(server.requests[requestsCount - 1].url).toBe(`${API_BASE_PATH}/indices/reload`);
      // Open context menu once again, since clicking an action will close it.
      await actions.clickManageContextMenuButton();
      // The unfreeze action should not be present anymore
      expect(exists('unfreezeIndexMenuButton')).toBe(false);
    });

    test('should be able to force merge an index', async () => {
      const { actions, exists } = testBed;

      httpRequestsMockHelpers.setReloadIndicesResponse([{ ...indexMockA, isFrozen: false }]);

      // Open context menu
      await actions.clickManageContextMenuButton();
      // Check that the force merge action exists for the current index and merge it
      expect(exists('forcemergeIndexMenuButton')).toBe(true);
      await actions.clickContextMenuOption('forcemergeIndexMenuButton');

      await actions.clickModalConfirm();

      const requestsCount = server.requests.length;
      expect(server.requests[requestsCount - 2].url).toBe(`${API_BASE_PATH}/indices/forcemerge`);
      // After the index is force merged, we immediately do a reload. So we need to expect to see
      // a reload server call also.
      expect(server.requests[requestsCount - 1].url).toBe(`${API_BASE_PATH}/indices/reload`);
    });
  });

  describe('Edit index settings', () => {
    test('shows error callout when request fails', async () => {
      const { actions, find, component, exists } = testBed;

      mockGetAceEditorValue.mockReturnValue(`{
        "index.routing.allocation.include._tier_preference": "non_existent_tier"
      }`);

      const error = {
        statusCode: 400,
        error: 'Bad Request',
        message: 'invalid tier names found in ...',
      };
      httpRequestsMockHelpers.setUpdateIndexSettingsResponse(undefined, error);

      await actions.selectIndexDetailsTab('edit_settings');

      await act(async () => {
        find('updateEditIndexSettingsButton').simulate('click');
      });

      component.update();

      expect(exists('updateIndexSettingsErrorCallout')).toBe(true);
    });
  });
});

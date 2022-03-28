/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { API_BASE_PATH } from '../../../common';
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
import { stubWebWorker } from '@kbn/test-jest-helpers';
import { createMemoryHistory } from 'history';
stubWebWorker();

describe('<IndexManagementHome />', () => {
  let testBed: IndicesTestBed;
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];

  beforeEach(() => {
    const mockEnvironment = setupEnvironment();
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;
  });

  describe('on component mount', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadIndicesResponse([]);

      testBed = await setup(httpSetup);

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
        {
          health: '',
          status: '',
          primary: '',
          replica: '',
          documents: '',
          documents_deleted: '',
          size: '',
          primary_size: '',
          name: 'no-data-stream-index',
          data_stream: null,
        },
      ]);

      // The detail panel should still appear even if there are no data streams.
      httpRequestsMockHelpers.setLoadDataStreamsResponse([]);

      httpRequestsMockHelpers.setLoadDataStreamResponse(
        'dataStream1',
        createDataStreamPayload({ name: 'dataStream1' })
      );

      testBed = await setup(httpSetup, {
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
        actions: { clickDataStreamAt, dataStreamLinkExistsAt },
      } = testBed;

      expect(dataStreamLinkExistsAt(0)).toBeTruthy();
      await clickDataStreamAt(0);

      expect(findDataStreamDetailPanel().length).toBe(1);
      expect(findDataStreamDetailPanelTitle()).toBe('dataStream1');
    });

    test(`doesn't show data stream link if the index doesn't have a data stream`, () => {
      const {
        actions: { dataStreamLinkExistsAt },
      } = testBed;

      expect(dataStreamLinkExistsAt(1)).toBeFalsy();
    });
  });

  describe('index detail panel with % character in index name', () => {
    const indexName = 'test%';

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadIndicesResponse([createNonDataStreamIndex(indexName)]);

      testBed = await setup(httpSetup);
      const { component, find } = testBed;

      component.update();

      find('indexTableIndexNameLink').at(0).simulate('click');
    });

    test('should encode indexName when loading settings in detail panel', async () => {
      const { actions } = testBed;
      await actions.selectIndexDetailsTab('settings');

      expect(httpSetup.get).toHaveBeenLastCalledWith(
        `${API_BASE_PATH}/settings/${encodeURIComponent(indexName)}`
      );
    });

    test('should encode indexName when loading mappings in detail panel', async () => {
      const { actions } = testBed;
      await actions.selectIndexDetailsTab('mappings');

      expect(httpSetup.get).toHaveBeenLastCalledWith(
        `${API_BASE_PATH}/mapping/${encodeURIComponent(indexName)}`
      );
    });

    test('should encode indexName when loading stats in detail panel', async () => {
      const { actions } = testBed;
      await actions.selectIndexDetailsTab('stats');

      expect(httpSetup.get).toHaveBeenLastCalledWith(
        `${API_BASE_PATH}/stats/${encodeURIComponent(indexName)}`
      );
    });

    test('should encode indexName when editing settings in detail panel', async () => {
      const { actions } = testBed;
      await actions.selectIndexDetailsTab('edit_settings');

      expect(httpSetup.get).toHaveBeenLastCalledWith(
        `${API_BASE_PATH}/settings/${encodeURIComponent(indexName)}`
      );
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

      testBed = await setup(httpSetup);
      const { component, find } = testBed;

      component.update();

      find('indexTableIndexNameLink').at(0).simulate('click');
    });

    test('should be able to refresh index', async () => {
      const { actions } = testBed;

      await actions.clickManageContextMenuButton();
      await actions.clickContextMenuOption('refreshIndexMenuButton');

      expect(httpSetup.post).toHaveBeenCalledWith(
        `${API_BASE_PATH}/indices/refresh`,
        expect.anything()
      );
      expect(httpSetup.post).toHaveBeenCalledWith(
        `${API_BASE_PATH}/indices/reload`,
        expect.anything()
      );
    });

    test('should be able to close an open index', async () => {
      const { actions } = testBed;

      await actions.clickManageContextMenuButton();
      await actions.clickContextMenuOption('closeIndexMenuButton');

      // After the index is closed, we imediately do a reload. So we need to expect to see
      // a reload server call also.
      expect(httpSetup.post).toHaveBeenCalledWith(
        `${API_BASE_PATH}/indices/close`,
        expect.anything()
      );
      expect(httpSetup.post).toHaveBeenCalledWith(
        `${API_BASE_PATH}/indices/reload`,
        expect.anything()
      );
    });

    test('should be able to open a closed index', async () => {
      testBed = await setup(httpSetup);
      const { component, find, actions } = testBed;

      component.update();

      find('indexTableIndexNameLink').at(1).simulate('click');

      await actions.clickManageContextMenuButton();
      await actions.clickContextMenuOption('openIndexMenuButton');

      // After the index is opened, we imediately do a reload. So we need to expect to see
      // a reload server call also.
      expect(httpSetup.post).toHaveBeenCalledWith(
        `${API_BASE_PATH}/indices/open`,
        expect.anything()
      );
      expect(httpSetup.post).toHaveBeenCalledWith(
        `${API_BASE_PATH}/indices/reload`,
        expect.anything()
      );
    });

    test('should be able to flush index', async () => {
      const { actions } = testBed;

      await actions.clickManageContextMenuButton();
      await actions.clickContextMenuOption('flushIndexMenuButton');

      // After the index is flushed, we imediately do a reload. So we need to expect to see
      // a reload server call also.
      expect(httpSetup.post).toHaveBeenCalledWith(
        `${API_BASE_PATH}/indices/flush`,
        expect.anything()
      );
      expect(httpSetup.post).toHaveBeenCalledWith(
        `${API_BASE_PATH}/indices/reload`,
        expect.anything()
      );
    });

    test("should be able to clear an index's cache", async () => {
      const { actions } = testBed;
      await actions.clickManageContextMenuButton();

      await actions.clickManageContextMenuButton();
      await actions.clickContextMenuOption('clearCacheIndexMenuButton');

      // After the index cache is cleared, we imediately do a reload. So we need to expect to see
      // a reload server call also.
      expect(httpSetup.post).toHaveBeenCalledWith(
        `${API_BASE_PATH}/indices/clear_cache`,
        expect.anything()
      );
      expect(httpSetup.post).toHaveBeenCalledWith(
        `${API_BASE_PATH}/indices/reload`,
        expect.anything()
      );
    });

    test('should be able to unfreeze a frozen index', async () => {
      const { actions, exists } = testBed;

      httpRequestsMockHelpers.setReloadIndicesResponse([{ ...indexMockA, isFrozen: false }]);

      // Open context menu
      await actions.clickManageContextMenuButton();
      // Check that the unfreeze action exists for the current index and unfreeze it
      expect(exists('unfreezeIndexMenuButton')).toBe(true);
      await actions.clickContextMenuOption('unfreezeIndexMenuButton');

      // After the index is unfrozen, we imediately do a reload. So we need to expect to see
      // a reload server call also.
      expect(httpSetup.post).toHaveBeenCalledWith(
        `${API_BASE_PATH}/indices/unfreeze`,
        expect.anything()
      );
      expect(httpSetup.post).toHaveBeenCalledWith(
        `${API_BASE_PATH}/indices/reload`,
        expect.anything()
      );

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

      // After the index force merged, we imediately do a reload. So we need to expect to see
      // a reload server call also.
      expect(httpSetup.post).toHaveBeenCalledWith(
        `${API_BASE_PATH}/indices/forcemerge`,
        expect.anything()
      );
      expect(httpSetup.post).toHaveBeenCalledWith(
        `${API_BASE_PATH}/indices/reload`,
        expect.anything()
      );
    });
  });

  describe('Edit index settings', () => {
    const indexName = 'test';

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadIndicesResponse([createNonDataStreamIndex(indexName)]);

      testBed = await setup(httpSetup);
      const { component, find } = testBed;

      component.update();

      find('indexTableIndexNameLink').at(0).simulate('click');
    });

    test('shows error callout when request fails', async () => {
      const { actions, find, component, exists } = testBed;

      mockGetAceEditorValue.mockReturnValue(`{
        "index.routing.allocation.include._tier_preference": "non_existent_tier"
      }`);

      const error = {
        status: 400,
        error: 'Bad Request',
        message: 'invalid tier names found in ...',
      };
      httpRequestsMockHelpers.setUpdateIndexSettingsResponse(indexName, undefined, error);

      await actions.selectIndexDetailsTab('edit_settings');

      await act(async () => {
        find('updateEditIndexSettingsButton').simulate('click');
      });

      component.update();

      expect(exists('updateIndexSettingsErrorCallout')).toBe(true);
    });
  });
});

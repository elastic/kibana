/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act } from 'react-dom/test-utils';

import { API_BASE_PATH } from '../../../common/constants';
import { setupEnvironment, nextTick } from '../helpers';

import { IndicesTestBed, setup } from './indices_tab.helpers';

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

    test('sets the hash query param base on include hidden indices toggle', () => {
      const { actions } = testBed;
      expect(actions.getIncludeHiddenIndicesToggleStatus()).toBe(true);
      expect(window.location.hash.includes('includeHidden=true')).toBe(true);
      actions.clickIncludeHiddenIndicesToggle();
      expect(window.location.hash.includes('includeHidden=true')).toBe(false);
      // Note: this test modifies the shared location.hash state, we put it back the way it was
      actions.clickIncludeHiddenIndicesToggle();
      expect(actions.getIncludeHiddenIndicesToggleStatus()).toBe(true);
      expect(window.location.hash.includes('includeHidden=true')).toBe(true);
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
});

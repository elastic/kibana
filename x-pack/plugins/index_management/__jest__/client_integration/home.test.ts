/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act } from 'react-dom/test-utils';
import * as fixtures from '../../test/fixtures';
import { setupEnvironment, pageHelpers, nextTick, getRandomString } from './helpers';
import { IdxMgmtHomeTestBed } from './helpers/home.helpers';
import { API_BASE_PATH } from '../../common/constants';

const { setup } = pageHelpers.home;

describe('<IndexManagementHome />', () => {
  const { server, httpRequestsMockHelpers } = setupEnvironment();
  let testBed: IdxMgmtHomeTestBed;

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

    test('should set the correct app title', () => {
      const { exists, find } = testBed;
      expect(exists('appTitle')).toBe(true);
      expect(find('appTitle').text()).toEqual('Index Management');
    });

    test('should have a link to the documentation', () => {
      const { exists, find } = testBed;
      expect(exists('documentationLink')).toBe(true);
      expect(find('documentationLink').text()).toBe('Index Management docs');
    });

    describe('tabs', () => {
      test('should have 2 tabs', () => {
        const { find } = testBed;
        const templatesTab = find('templatesTab');
        const indicesTab = find('indicesTab');

        expect(indicesTab.length).toBe(1);
        expect(indicesTab.text()).toEqual('Indices');
        expect(templatesTab.length).toBe(1);
        expect(templatesTab.text()).toEqual('Index Templates');
      });

      test('should navigate to Index Templates tab', async () => {
        const { exists, actions, component } = testBed;

        expect(exists('indicesList')).toBe(true);
        expect(exists('templateList')).toBe(false);

        httpRequestsMockHelpers.setLoadTemplatesResponse([]);

        actions.selectHomeTab('templatesTab');

        await act(async () => {
          await nextTick();
          component.update();
        });

        expect(exists('indicesList')).toBe(false);
        expect(exists('templateList')).toBe(true);
      });
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

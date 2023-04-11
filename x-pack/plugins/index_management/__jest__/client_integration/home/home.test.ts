/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { setupEnvironment, nextTick } from '../helpers';
import { HomeTestBed, setup } from './home.helpers';

/**
 * The below import is required to avoid a console error warn from the "brace" package
 * console.warn ../node_modules/brace/index.js:3999
      Could not load worker ReferenceError: Worker is not defined
          at createWorker (/<path-to-repo>/node_modules/brace/index.js:17992:5)
 */
import { stubWebWorker } from '@kbn/test/jest';
stubWebWorker();

describe('<IndexManagementHome />', () => {
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();
  let testBed: HomeTestBed;

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
      test('should have 4 tabs', () => {
        const { find } = testBed;

        const indexManagementContainer = find('indexManagementHeaderContent');
        const tabListContainer = indexManagementContainer.find('.euiTabs');
        const allTabs = tabListContainer.children();
        const allTabsLabels = ['Indices', 'Data Streams', 'Index Templates', 'Component Templates'];

        expect(allTabs.length).toBe(4);
        for (let i = 0; i < allTabs.length; i++) {
          expect(tabListContainer.childAt(i).text()).toEqual(allTabsLabels[i]);
        }
      });

      test('should navigate to Index Templates tab', async () => {
        const { exists, actions, component } = testBed;

        expect(exists('indicesList')).toBe(true);
        expect(exists('templateList')).toBe(false);

        httpRequestsMockHelpers.setLoadTemplatesResponse({ templates: [], legacyTemplates: [] });

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
});

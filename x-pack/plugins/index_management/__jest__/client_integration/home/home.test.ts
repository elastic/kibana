/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { setupEnvironment } from '../helpers';
import { HomeTestBed, setup } from './home.helpers';

describe('<IndexManagementHome />', () => {
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();
  let testBed: HomeTestBed;

  describe('on component mount', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadIndicesResponse([]);

      await act(async () => {
        testBed = await setup(httpSetup);
      });
      testBed.component.update();
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
        const tabListContainer = indexManagementContainer.find('div.euiTabs');
        const allTabs = tabListContainer.children();
        const allTabsLabels = [
          'Indices',
          'Data Streams',
          'Index Templates',
          'Component Templates',
          'Enrich Policies',
        ];

        expect(allTabs.length).toBe(5);
        for (let i = 0; i < allTabs.length; i++) {
          expect(tabListContainer.childAt(i).text()).toEqual(allTabsLabels[i]);
        }
      });

      test('should navigate to Index Templates tab', async () => {
        const { exists, actions, component } = testBed;

        expect(exists('indicesList')).toBe(true);
        expect(exists('templateList')).toBe(false);

        httpRequestsMockHelpers.setLoadTemplatesResponse({ templates: [], legacyTemplates: [] });

        await act(async () => {
          actions.selectHomeTab('templatesTab');
        });

        component.update();
        expect(exists('indicesList')).toBe(false);
        expect(exists('templateList')).toBe(true);
      });
    });
  });
});

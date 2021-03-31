/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { indexSettingDeprecations } from '../common/constants';
import { MIGRATION_DEPRECATION_LEVEL } from '../common/types';

import { IndicesTestBed, setupIndicesPage, setupEnvironment } from './helpers';

describe('Indices tab', () => {
  let testBed: IndicesTestBed;
  const { server, httpRequestsMockHelpers } = setupEnvironment();

  afterAll(() => {
    server.restore();
  });

  describe('with deprecations', () => {
    const upgradeStatusMockResponse = {
      readyForUpgrade: false,
      cluster: [],
      indices: [
        {
          level: 'warning' as MIGRATION_DEPRECATION_LEVEL,
          message: indexSettingDeprecations.translog.deprecationMessage,
          url: 'doc_url',
          index: 'my_index',
          deprecatedIndexSettings: indexSettingDeprecations.translog.settings,
        },
      ],
    };

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadStatusResponse(upgradeStatusMockResponse);
      httpRequestsMockHelpers.setLoadDeprecationLoggingResponse({ isEnabled: true });

      await act(async () => {
        testBed = await setupIndicesPage({ isReadOnlyMode: false });
      });

      const { actions, component } = testBed;

      component.update();

      // Navigate to the indices tab
      await act(async () => {
        actions.clickTab('indices');
      });

      component.update();
    });

    test('renders deprecations', () => {
      const { exists, find } = testBed;
      expect(exists('deprecationsContainer')).toBe(true);
      expect(find('indexCount').text()).toEqual('1');
    });

    describe('fix indices button', () => {
      test('removes deprecated index settings', async () => {
        const { component, actions, exists, find } = testBed;

        expect(exists('deprecationsContainer')).toBe(true);

        // Open all deprecations
        actions.clickExpandAll();

        const accordionTestSubj = `depgroup_${indexSettingDeprecations.translog.deprecationMessage
          .split(' ')
          .join('_')}`;

        await act(async () => {
          find(`${accordionTestSubj}.removeIndexSettingsButton`).simulate('click');
        });

        // We need to read the document "body" as the modal is added there and not inside
        // the component DOM tree.
        const modal = document.body.querySelector(
          '[data-test-subj="indexSettingsDeleteConfirmModal"]'
        );
        const confirmButton: HTMLButtonElement | null = modal!.querySelector(
          '[data-test-subj="confirmModalConfirmButton"]'
        );

        expect(modal).not.toBe(null);
        expect(modal!.textContent).toContain('Remove deprecated settings');

        const indexName = upgradeStatusMockResponse.indices[0].index;

        httpRequestsMockHelpers.setUpdateIndexSettingsResponse({
          acknowledged: true,
        });

        await act(async () => {
          confirmButton!.click();
        });

        component.update();

        const request = server.requests[server.requests.length - 1];

        expect(request.method).toBe('POST');
        expect(request.url).toBe(`/api/upgrade_assistant/${indexName}/index_settings`);
        expect(request.status).toEqual(200);
      });
    });
  });

  describe('no deprecations', () => {
    beforeEach(async () => {
      const noDeprecationsResponse = {
        readyForUpgrade: false,
        cluster: [],
        indices: [],
      };

      httpRequestsMockHelpers.setLoadStatusResponse(noDeprecationsResponse);

      await act(async () => {
        testBed = await setupIndicesPage({ isReadOnlyMode: false });
      });

      const { actions, component } = testBed;

      component.update();

      // Navigate to the indices tab
      await act(async () => {
        actions.clickTab('indices');
      });

      component.update();
    });

    test('renders prompt', () => {
      const { exists, find } = testBed;
      expect(exists('noDeprecationsPrompt')).toBe(true);
      expect(find('noDeprecationsPrompt').text()).toContain('All clear!');
    });
  });

  describe('error handling', () => {
    test('handles 403', async () => {
      const error = {
        statusCode: 403,
        error: 'Forbidden',
        message: 'Forbidden',
      };

      httpRequestsMockHelpers.setLoadStatusResponse(undefined, error);

      await act(async () => {
        testBed = await setupIndicesPage({ isReadOnlyMode: false });
      });

      const { component, exists, find } = testBed;

      component.update();

      expect(exists('permissionsError')).toBe(true);
      expect(find('permissionsError').text()).toContain(
        'You do not have sufficient privileges to view this page.'
      );
    });

    test('handles generic error', async () => {
      const error = {
        statusCode: 500,
        error: 'Internal server error',
        message: 'Internal server error',
      };

      httpRequestsMockHelpers.setLoadStatusResponse(undefined, error);

      await act(async () => {
        testBed = await setupIndicesPage({ isReadOnlyMode: false });
      });

      const { component, exists, find } = testBed;

      component.update();

      expect(exists('upgradeStatusError')).toBe(true);
      expect(find('upgradeStatusError').text()).toContain(
        'An error occurred while retrieving the checkup results.'
      );
    });
  });
});

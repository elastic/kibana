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

  httpRequestsMockHelpers.setLoadStatusResponse(upgradeStatusMockResponse);

  beforeEach(async () => {
    await act(async () => {
      testBed = await setupIndicesPage({ isReadOnlyMode: false });
    });

    // Navigate to the indices tab
    testBed.actions.clickTab('indices');
  });

  afterAll(() => {
    server.restore();
  });

  describe('Fix indices button', () => {
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

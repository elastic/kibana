/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { setupEnvironment } from '../helpers';
import { ElasticsearchTestBed, setupElasticsearchPage } from './es_deprecations.helpers';
import {
  esDeprecationsMockResponse,
  MOCK_SNAPSHOT_ID,
  MOCK_JOB_ID,
  MOCK_REINDEX_DEPRECATION,
} from './mocked_responses';

describe('Index settings deprecation flyout', () => {
  let testBed: ElasticsearchTestBed;
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  const indexSettingDeprecation = esDeprecationsMockResponse.deprecations[1];
  beforeEach(async () => {
    const mockEnvironment = setupEnvironment();
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;

    httpRequestsMockHelpers.setLoadEsDeprecationsResponse(esDeprecationsMockResponse);
    httpRequestsMockHelpers.setUpgradeMlSnapshotStatusResponse({
      nodeId: 'my_node',
      snapshotId: MOCK_SNAPSHOT_ID,
      jobId: MOCK_JOB_ID,
      status: 'idle',
    });
    httpRequestsMockHelpers.setReindexStatusResponse(MOCK_REINDEX_DEPRECATION.index!, {
      reindexOp: null,
      warnings: [],
      hasRequiredPrivileges: true,
      meta: {
        indexName: 'foo',
        reindexName: 'reindexed-foo',
        aliases: [],
      },
    });

    await act(async () => {
      testBed = await setupElasticsearchPage(httpSetup, { isReadOnlyMode: false });
    });

    const { actions, component } = testBed;
    component.update();
    await actions.table.clickDeprecationRowAt('indexSetting', 0);
  });

  it('renders a flyout with deprecation details', async () => {
    const { find, exists } = testBed;

    expect(exists('indexSettingsDetails')).toBe(true);
    expect(find('indexSettingsDetails.flyoutTitle').text()).toContain(
      indexSettingDeprecation.message
    );
    expect(find('indexSettingsDetails.documentationLink').props().href).toBe(
      indexSettingDeprecation.url
    );
    expect(exists('removeSettingsPrompt')).toBe(true);
  });

  it('removes deprecated index settings', async () => {
    const { find, actions, exists } = testBed;

    httpRequestsMockHelpers.setUpdateIndexSettingsResponse(indexSettingDeprecation.index!, {
      acknowledged: true,
    });

    expect(exists('indexSettingsDetails.warningDeprecationBadge')).toBe(true);

    await actions.indexSettingsDeprecationFlyout.clickDeleteSettingsButton();

    expect(httpSetup.post).toHaveBeenLastCalledWith(
      `/api/upgrade_assistant/${indexSettingDeprecation.index!}/index_settings`,
      expect.anything()
    );

    // Verify the "Resolution" column of the table is updated
    expect(find('indexSettingsResolutionStatusCell').at(0).text()).toEqual(
      'Deprecated settings removed'
    );

    // Reopen the flyout
    await actions.table.clickDeprecationRowAt('indexSetting', 0);

    // Verify prompt to remove setting no longer displays
    expect(find('removeSettingsPrompt').length).toEqual(0);
    // Verify the action button no longer displays
    expect(find('indexSettingsDetails.deleteSettingsButton').length).toEqual(0);
    // Verify the badge got marked as resolved
    expect(exists('indexSettingsDetails.resolvedDeprecationBadge')).toBe(true);
  });

  it('handles failure', async () => {
    const { find, actions } = testBed;
    const error = {
      statusCode: 500,
      error: 'Remove index settings error',
      message: 'Remove index settings error',
    };

    httpRequestsMockHelpers.setUpdateIndexSettingsResponse(
      indexSettingDeprecation.index!,
      undefined,
      error
    );

    await actions.indexSettingsDeprecationFlyout.clickDeleteSettingsButton();

    expect(httpSetup.post).toHaveBeenLastCalledWith(
      `/api/upgrade_assistant/${indexSettingDeprecation.index!}/index_settings`,
      expect.anything()
    );

    // Verify the "Resolution" column of the table is updated
    expect(find('indexSettingsResolutionStatusCell').at(0).text()).toEqual(
      'Settings removal failed'
    );

    // Reopen the flyout
    await actions.table.clickDeprecationRowAt('indexSetting', 0);

    // Verify the flyout shows an error message
    expect(find('indexSettingsDetails.deleteSettingsError').text()).toContain(
      'Error deleting index settings'
    );
    // Verify the remove settings button text changes
    expect(find('indexSettingsDetails.deleteSettingsButton').text()).toEqual(
      'Retry removing deprecated settings'
    );
  });
});

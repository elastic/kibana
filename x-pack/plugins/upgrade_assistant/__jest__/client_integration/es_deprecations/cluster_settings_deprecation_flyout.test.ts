/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { setupEnvironment } from '../helpers';
import { ElasticsearchTestBed, setupElasticsearchPage } from './es_deprecations.helpers';
import { esDeprecationsMockResponse } from './mocked_responses';
import { MOCK_REINDEX_DEPRECATION } from './mocked_responses';

describe('Cluster settings deprecation flyout', () => {
  let testBed: ElasticsearchTestBed;
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  const clusterSettingDeprecation = esDeprecationsMockResponse.deprecations[4];

  beforeEach(async () => {
    const mockEnvironment = setupEnvironment();
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;

    httpRequestsMockHelpers.setLoadEsDeprecationsResponse(esDeprecationsMockResponse);
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
    await actions.table.clickDeprecationRowAt('clusterSetting', 0);
  });

  test('renders a flyout with deprecation details', async () => {
    const { find, exists } = testBed;

    expect(exists('clusterSettingsDetails')).toBe(true);
    expect(find('clusterSettingsDetails.flyoutTitle').text()).toContain(
      clusterSettingDeprecation.message
    );
    expect(find('clusterSettingsDetails.documentationLink').props().href).toBe(
      clusterSettingDeprecation.url
    );
    expect(exists('removeClusterSettingsPrompt')).toBe(true);
  });

  it('removes deprecated cluster settings', async () => {
    const { find, actions, exists } = testBed;

    httpRequestsMockHelpers.setClusterSettingsResponse({
      acknowledged: true,
      persistent: {},
      transietn: {},
    });

    expect(exists('clusterSettingsDetails.warningDeprecationBadge')).toBe(true);

    await actions.clusterSettingsDeprecationFlyout.clickDeleteSettingsButton();

    expect(httpSetup.post).toHaveBeenLastCalledWith(
      `/api/upgrade_assistant/cluster_settings`,
      expect.anything()
    );

    // Verify the "Resolution" column of the table is updated
    expect(find('clusterSettingsResolutionStatusCell').at(0).text()).toEqual(
      'Deprecated settings removed'
    );

    // Reopen the flyout
    await actions.table.clickDeprecationRowAt('clusterSetting', 0);

    // Verify prompt to remove setting no longer displays
    expect(find('removeSettingsPrompt').length).toEqual(0);
    // Verify the action button no longer displays
    expect(find('clusterSettingsDetails.deleteSettingsButton').length).toEqual(0);
    // Verify the badge got marked as resolved
    expect(exists('clusterSettingsDetails.resolvedDeprecationBadge')).toBe(true);
  });

  it('handles failure', async () => {
    const { find, actions } = testBed;
    const error = {
      statusCode: 500,
      error: 'Remove cluster settings error',
      message: 'Remove cluster settings error',
    };

    httpRequestsMockHelpers.setClusterSettingsResponse(undefined, error);

    await actions.clusterSettingsDeprecationFlyout.clickDeleteSettingsButton();

    expect(httpSetup.post).toHaveBeenLastCalledWith(
      `/api/upgrade_assistant/cluster_settings`,
      expect.anything()
    );

    // Verify the "Resolution" column of the table is updated
    expect(find('clusterSettingsResolutionStatusCell').at(0).text()).toEqual(
      'Settings removal failed'
    );

    // Reopen the flyout
    await actions.table.clickDeprecationRowAt('clusterSetting', 0);

    // Verify the flyout shows an error message
    expect(find('clusterSettingsDetails.deleteClusterSettingsError').text()).toContain(
      'Error deleting cluster settings'
    );
    // Verify the remove settings button text changes
    expect(find('clusterSettingsDetails.deleteClusterSettingsButton').text()).toEqual(
      'Retry removing deprecated settings'
    );
  });
});

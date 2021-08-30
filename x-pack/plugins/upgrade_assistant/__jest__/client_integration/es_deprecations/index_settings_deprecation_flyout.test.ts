/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { ElasticsearchTestBed, setupElasticsearchPage, setupEnvironment } from '../helpers';

import { esDeprecationsMockResponse, MOCK_SNAPSHOT_ID, MOCK_JOB_ID } from './mocked_responses';

describe('Index settings deprecation flyout', () => {
  let testBed: ElasticsearchTestBed;
  const { server, httpRequestsMockHelpers } = setupEnvironment();
  const indexSettingDeprecation = esDeprecationsMockResponse.deprecations[1];

  afterAll(() => {
    server.restore();
  });

  beforeEach(async () => {
    httpRequestsMockHelpers.setLoadEsDeprecationsResponse(esDeprecationsMockResponse);
    httpRequestsMockHelpers.setUpgradeMlSnapshotStatusResponse({
      nodeId: 'my_node',
      snapshotId: MOCK_SNAPSHOT_ID,
      jobId: MOCK_JOB_ID,
      status: 'idle',
    });

    await act(async () => {
      testBed = await setupElasticsearchPage({ isReadOnlyMode: false });
    });

    const { find, exists, actions, component } = testBed;

    component.update();

    await actions.clickIndexSettingsDeprecationAt(0);

    expect(exists('indexSettingsDetails')).toBe(true);
    expect(find('indexSettingsDetails.flyoutTitle').text()).toContain(
      indexSettingDeprecation.message
    );
    expect(exists('removeSettingsPrompt')).toBe(true);
  });

  it('removes deprecated index settings', async () => {
    const { find, actions } = testBed;

    httpRequestsMockHelpers.setUpdateIndexSettingsResponse({
      acknowledged: true,
    });

    await actions.clickDeleteSettingsButton();

    const request = server.requests[server.requests.length - 1];

    expect(request.method).toBe('POST');
    expect(request.url).toBe(
      `/api/upgrade_assistant/${indexSettingDeprecation.index!}/index_settings`
    );
    expect(request.status).toEqual(200);

    // Verify the "Resolution" column of the table is updated
    expect(find('indexSettingsResolutionStatusCell').at(0).text()).toEqual(
      'Deprecated settings removed'
    );

    // Reopen the flyout
    await actions.clickIndexSettingsDeprecationAt(0);

    // Verify prompt to remove setting no longer displays
    expect(find('removeSettingsPrompt').length).toEqual(0);
    // Verify the action button no longer displays
    expect(find('indexSettingsDetails.deleteSettingsButton').length).toEqual(0);
  });

  it('handles failure', async () => {
    const { find, actions } = testBed;
    const error = {
      statusCode: 500,
      error: 'Remove index settings error',
      message: 'Remove index settings error',
    };

    httpRequestsMockHelpers.setUpdateIndexSettingsResponse(undefined, error);

    await actions.clickDeleteSettingsButton();

    const request = server.requests[server.requests.length - 1];

    expect(request.method).toBe('POST');
    expect(request.url).toBe(
      `/api/upgrade_assistant/${indexSettingDeprecation.index!}/index_settings`
    );
    expect(request.status).toEqual(500);

    // Verify the "Resolution" column of the table is updated
    expect(find('indexSettingsResolutionStatusCell').at(0).text()).toEqual(
      'Settings removal failed'
    );

    // Reopen the flyout
    await actions.clickIndexSettingsDeprecationAt(0);

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

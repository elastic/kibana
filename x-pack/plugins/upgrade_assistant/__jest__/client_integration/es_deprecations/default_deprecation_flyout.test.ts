/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { setupEnvironment } from '../helpers';
import { ElasticsearchTestBed, setupElasticsearchPage } from './es_deprecations.helpers';
import { esDeprecationsMockResponse, MOCK_SNAPSHOT_ID, MOCK_JOB_ID } from './mocked_responses';

describe('Default deprecation flyout', () => {
  let testBed: ElasticsearchTestBed;
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
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
    httpRequestsMockHelpers.setReindexStatusResponse('reindex_index', {
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
      testBed = await setupElasticsearchPage(httpSetup, {
        isReadOnlyMode: false,
      });
    });

    testBed.component.update();
  });

  test('renders a flyout with deprecation details', async () => {
    const multiFieldsDeprecation = esDeprecationsMockResponse.deprecations[2];
    const { actions, find, exists } = testBed;

    await actions.table.clickDeprecationRowAt('default', 0);

    expect(exists('defaultDeprecationDetails')).toBe(true);
    expect(find('defaultDeprecationDetails.flyoutTitle').text()).toContain(
      multiFieldsDeprecation.message
    );
    expect(find('defaultDeprecationDetails.documentationLink').props().href).toBe(
      multiFieldsDeprecation.url
    );
    expect(find('defaultDeprecationDetails.flyoutDescription').text()).toContain(
      multiFieldsDeprecation.index
    );
  });
});

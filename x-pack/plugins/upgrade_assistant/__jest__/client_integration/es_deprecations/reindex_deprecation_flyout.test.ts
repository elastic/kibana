/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { ElasticsearchTestBed, setupElasticsearchPage, setupEnvironment } from '../helpers';

import { esDeprecationsMockResponse, MOCK_SNAPSHOT_ID, MOCK_JOB_ID } from './mocked_responses';

// Note: The reindexing flyout UX is subject to change; more tests should be added here once functionality is built out
describe('Reindex deprecation flyout', () => {
  let testBed: ElasticsearchTestBed;
  const { server, httpRequestsMockHelpers } = setupEnvironment();

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

    testBed.component.update();
  });

  it('renders a flyout with reindexing details', async () => {
    const reindexDeprecation = esDeprecationsMockResponse.deprecations[3];
    const { actions, find, exists } = testBed;

    await actions.clickReindexDeprecationAt(0);

    expect(exists('reindexDetails')).toBe(true);
    expect(find('reindexDetails.flyoutTitle').text()).toContain(
      `Reindex ${reindexDeprecation.index}`
    );
  });
});

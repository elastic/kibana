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
import { ReindexStatus, ReindexStep } from '../../../common/types';

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

    await actions.table.clickDeprecationRowAt('reindex', 0);

    expect(exists('reindexDetails')).toBe(true);
    expect(find('reindexDetails.flyoutTitle').text()).toContain(
      `Reindex ${reindexDeprecation.index}`
    );
  });

  it('renders error callout when reindex fails', async () => {
    httpRequestsMockHelpers.setReindexStatusResponse({
      reindexOp: null,
      warnings: [],
      hasRequiredPrivileges: true,
    });

    await act(async () => {
      testBed = await setupElasticsearchPage({ isReadOnlyMode: false });
    });

    testBed.component.update();

    const { actions, exists } = testBed;

    await actions.table.clickDeprecationRowAt('reindex', 0);

    httpRequestsMockHelpers.setStartReindexingResponse(undefined, {
      statusCode: 404,
      message: 'no such index [test]',
    });

    await actions.reindexDeprecationFlyout.clickReindexButton();

    expect(exists('reindexDetails.reindexingFailedCallout')).toBe(true);
  });

  it('renders error callout when fetch status fails', async () => {
    httpRequestsMockHelpers.setReindexStatusResponse(undefined, {
      statusCode: 404,
      message: 'no such index [test]',
    });

    await act(async () => {
      testBed = await setupElasticsearchPage({ isReadOnlyMode: false });
    });

    testBed.component.update();

    const { actions, exists } = testBed;

    await actions.table.clickDeprecationRowAt('reindex', 0);

    expect(exists('reindexDetails.fetchFailedCallout')).toBe(true);
  });

  describe('reindexing progress', () => {
    it('has not started yet', async () => {
      const { actions, find, exists } = testBed;

      await actions.table.clickDeprecationRowAt('reindex', 0);
      expect(find('reindexChecklistTitle').text()).toEqual('Reindexing process');
      expect(exists('cancelReindexingDocumentsButton')).toBe(false);
    });

    it('has started but not yet reindexing documents', async () => {
      httpRequestsMockHelpers.setReindexStatusResponse({
        reindexOp: {
          status: ReindexStatus.inProgress,
          lastCompletedStep: ReindexStep.readonly,
          reindexTaskPercComplete: null,
        },
        warnings: [],
        hasRequiredPrivileges: true,
      });

      await act(async () => {
        testBed = await setupElasticsearchPage({ isReadOnlyMode: false });
      });

      testBed.component.update();
      const { actions, find, exists } = testBed;

      await actions.table.clickDeprecationRowAt('reindex', 0);

      expect(find('reindexChecklistTitle').text()).toEqual('Reindexing in progress… 5%');
      expect(exists('cancelReindexingDocumentsButton')).toBe(false);
    });

    it('has started reindexing documents', async () => {
      httpRequestsMockHelpers.setReindexStatusResponse({
        reindexOp: {
          status: ReindexStatus.inProgress,
          lastCompletedStep: ReindexStep.reindexStarted,
          reindexTaskPercComplete: 0.25,
        },
        warnings: [],
        hasRequiredPrivileges: true,
      });

      await act(async () => {
        testBed = await setupElasticsearchPage({ isReadOnlyMode: false });
      });

      testBed.component.update();
      const { actions, find, exists } = testBed;

      await actions.table.clickDeprecationRowAt('reindex', 0);

      expect(find('reindexChecklistTitle').text()).toEqual('Reindexing in progress… 31%');
      expect(exists('cancelReindexingDocumentsButton')).toBe(true);
    });

    it('has completed reindexing documents', async () => {
      httpRequestsMockHelpers.setReindexStatusResponse({
        reindexOp: {
          status: ReindexStatus.inProgress,
          lastCompletedStep: ReindexStep.reindexCompleted,
          reindexTaskPercComplete: 1,
        },
        warnings: [],
        hasRequiredPrivileges: true,
      });

      await act(async () => {
        testBed = await setupElasticsearchPage({ isReadOnlyMode: false });
      });

      testBed.component.update();
      const { actions, find, exists } = testBed;

      await actions.table.clickDeprecationRowAt('reindex', 0);

      expect(find('reindexChecklistTitle').text()).toEqual('Reindexing in progress… 95%');
      expect(exists('cancelReindexingDocumentsButton')).toBe(false);
    });

    it('has completed', async () => {
      httpRequestsMockHelpers.setReindexStatusResponse({
        reindexOp: {
          status: ReindexStatus.completed,
          lastCompletedStep: ReindexStep.aliasCreated,
          reindexTaskPercComplete: 1,
        },
        warnings: [],
        hasRequiredPrivileges: true,
      });

      await act(async () => {
        testBed = await setupElasticsearchPage({ isReadOnlyMode: false });
      });

      testBed.component.update();
      const { actions, find, exists } = testBed;

      await actions.table.clickDeprecationRowAt('reindex', 0);

      expect(find('reindexChecklistTitle').text()).toEqual('Reindexing process');
      expect(exists('cancelReindexingDocumentsButton')).toBe(false);
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { ReindexStatus, ReindexStep, ReindexStatusResponse } from '../../../common/types';
import { setupEnvironment } from '../helpers';
import { ElasticsearchTestBed, setupElasticsearchPage } from './es_deprecations.helpers';
import {
  esDeprecationsMockResponse,
  MOCK_SNAPSHOT_ID,
  MOCK_JOB_ID,
  MOCK_REINDEX_DEPRECATION,
} from './mocked_responses';

const defaultReindexStatusMeta: ReindexStatusResponse['meta'] = {
  indexName: 'foo',
  reindexName: 'reindexed-foo',
  aliases: [],
};

describe('Reindex deprecation flyout', () => {
  let testBed: ElasticsearchTestBed;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

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
    httpRequestsMockHelpers.setLoadNodeDiskSpaceResponse([]);

    await act(async () => {
      testBed = await setupElasticsearchPage(httpSetup, { isReadOnlyMode: false });
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
    await act(async () => {
      testBed = await setupElasticsearchPage(httpSetup, { isReadOnlyMode: false });
    });

    testBed.component.update();

    const { actions, exists } = testBed;

    await actions.table.clickDeprecationRowAt('reindex', 0);

    httpRequestsMockHelpers.setStartReindexingResponse(MOCK_REINDEX_DEPRECATION.index!, undefined, {
      statusCode: 404,
      message: 'no such index [test]',
    });

    await actions.reindexDeprecationFlyout.clickReindexButton();

    expect(exists('reindexDetails.reindexingFailedCallout')).toBe(true);
  });

  it('renders error callout when fetch status fails', async () => {
    httpRequestsMockHelpers.setReindexStatusResponse(MOCK_REINDEX_DEPRECATION.index!, undefined, {
      statusCode: 404,
      message: 'no such index [test]',
    });

    await act(async () => {
      testBed = await setupElasticsearchPage(httpSetup, { isReadOnlyMode: false });
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
      httpRequestsMockHelpers.setReindexStatusResponse(MOCK_REINDEX_DEPRECATION.index!, {
        reindexOp: {
          status: ReindexStatus.inProgress,
          lastCompletedStep: ReindexStep.readonly,
          reindexTaskPercComplete: null,
        },
        warnings: [],
        hasRequiredPrivileges: true,
        meta: defaultReindexStatusMeta,
      });

      await act(async () => {
        testBed = await setupElasticsearchPage(httpSetup, { isReadOnlyMode: false });
      });

      testBed.component.update();
      const { actions, find, exists } = testBed;

      await actions.table.clickDeprecationRowAt('reindex', 0);

      expect(find('reindexChecklistTitle').text()).toEqual('Reindexing in progress… 5%');
      expect(exists('cancelReindexingDocumentsButton')).toBe(false);
    });

    it('has started reindexing documents', async () => {
      httpRequestsMockHelpers.setReindexStatusResponse(MOCK_REINDEX_DEPRECATION.index!, {
        reindexOp: {
          status: ReindexStatus.inProgress,
          lastCompletedStep: ReindexStep.reindexStarted,
          reindexTaskPercComplete: 0.25,
        },
        warnings: [],
        hasRequiredPrivileges: true,
        meta: defaultReindexStatusMeta,
      });

      await act(async () => {
        testBed = await setupElasticsearchPage(httpSetup, { isReadOnlyMode: false });
      });

      testBed.component.update();
      const { actions, find, exists } = testBed;

      await actions.table.clickDeprecationRowAt('reindex', 0);

      expect(find('reindexChecklistTitle').text()).toEqual('Reindexing in progress… 30%');
      expect(exists('cancelReindexingDocumentsButton')).toBe(true);
    });

    it('has completed reindexing documents', async () => {
      httpRequestsMockHelpers.setReindexStatusResponse(MOCK_REINDEX_DEPRECATION.index!, {
        reindexOp: {
          status: ReindexStatus.inProgress,
          lastCompletedStep: ReindexStep.reindexCompleted,
          reindexTaskPercComplete: 1,
        },
        warnings: [],
        hasRequiredPrivileges: true,
        meta: defaultReindexStatusMeta,
      });

      await act(async () => {
        testBed = await setupElasticsearchPage(httpSetup, { isReadOnlyMode: false });
      });

      testBed.component.update();
      const { actions, find, exists } = testBed;

      await actions.table.clickDeprecationRowAt('reindex', 0);

      expect(find('reindexChecklistTitle').text()).toEqual('Reindexing in progress… 90%');
      expect(exists('cancelReindexingDocumentsButton')).toBe(false);
    });

    it('has completed', async () => {
      httpRequestsMockHelpers.setReindexStatusResponse(MOCK_REINDEX_DEPRECATION.index!, {
        reindexOp: {
          status: ReindexStatus.completed,
          lastCompletedStep: ReindexStep.aliasCreated,
          reindexTaskPercComplete: 1,
        },
        warnings: [],
        hasRequiredPrivileges: true,
        meta: defaultReindexStatusMeta,
      });

      await act(async () => {
        testBed = await setupElasticsearchPage(httpSetup, { isReadOnlyMode: false });
      });

      const { actions, find, exists, component } = testBed;
      component.update();

      await actions.table.clickDeprecationRowAt('reindex', 0);

      expect(find('reindexChecklistTitle').text()).toEqual('Reindexing in progress… 95%');
      expect(exists('cancelReindexingDocumentsButton')).toBe(false);

      // We have put in place a "fake" fifth step to delete the original index
      // In reality that was done in the last step (when the alias was created),
      // but for the user we will display it as a separate reindex step
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      component.update();

      expect(find('reindexChecklistTitle').text()).toEqual('Reindexing process');
    });
  });

  describe('low disk space', () => {
    it('renders a warning callout if nodes detected with low disk space', async () => {
      httpRequestsMockHelpers.setLoadNodeDiskSpaceResponse([
        {
          nodeId: '9OFkjpAKS_aPzJAuEOSg7w',
          nodeName: 'MacBook-Pro.local',
          available: '25%',
          lowDiskWatermarkSetting: '50%',
        },
      ]);

      await act(async () => {
        testBed = await setupElasticsearchPage(httpSetup, { isReadOnlyMode: false });
      });

      testBed.component.update();
      const { actions, find } = testBed;

      await actions.table.clickDeprecationRowAt('reindex', 0);

      expect(find('lowDiskSpaceCallout').text()).toContain('Nodes with low disk space');
      expect(find('impactedNodeListItem').length).toEqual(1);
      expect(find('impactedNodeListItem').at(0).text()).toContain(
        'MacBook-Pro.local (25% available)'
      );
    });
  });
});

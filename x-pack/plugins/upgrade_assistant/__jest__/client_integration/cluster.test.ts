/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { MlAction, ESUpgradeStatus } from '../../common/types';

import { ClusterTestBed, setupClusterPage, setupEnvironment } from './helpers';

describe('Cluster tab', () => {
  let testBed: ClusterTestBed;
  const { server, httpRequestsMockHelpers } = setupEnvironment();

  afterAll(() => {
    server.restore();
  });

  describe('with deprecations', () => {
    const snapshotId = '1';
    const jobId = 'deprecation_check_job';
    const esDeprecationsMockResponse: ESUpgradeStatus = {
      totalCriticalDeprecations: 1,
      cluster: [
        {
          level: 'critical',
          message:
            'model snapshot [1] for job [deprecation_check_job] needs to be deleted or upgraded',
          details:
            'model snapshot [%s] for job [%s] supports minimum version [%s] and needs to be at least [%s]',
          url: 'doc_url',
          correctiveAction: {
            type: 'mlSnapshot',
            snapshotId,
            jobId,
          },
        },
      ],
      indices: [],
    };

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadEsDeprecationsResponse(esDeprecationsMockResponse);
      httpRequestsMockHelpers.setLoadDeprecationLoggingResponse({
        isDeprecationLogIndexingEnabled: true,
        isDeprecationLoggingEnabled: true,
      });

      await act(async () => {
        testBed = await setupClusterPage({ isReadOnlyMode: false });
      });

      const { actions, component } = testBed;

      component.update();

      // Navigate to the cluster tab
      await act(async () => {
        actions.clickTab('cluster');
      });

      component.update();
    });

    test('renders deprecations', () => {
      const { exists } = testBed;
      expect(exists('clusterTabContent')).toBe(true);
      expect(exists('deprecationsContainer')).toBe(true);
    });

    describe('fix ml snapshots button', () => {
      let flyout: Element | null;

      beforeEach(async () => {
        const { component, actions, exists, find } = testBed;

        expect(exists('deprecationsContainer')).toBe(true);

        // Open all deprecations
        actions.clickExpandAll();

        // The data-test-subj is derived from the deprecation message
        const accordionTestSubj = `depgroup_${esDeprecationsMockResponse.cluster[0].message
          .split(' ')
          .join('_')}`;

        await act(async () => {
          find(`${accordionTestSubj}.fixMlSnapshotsButton`).simulate('click');
        });

        component.update();

        // We need to read the document "body" as the flyout is added there and not inside
        // the component DOM tree.
        flyout = document.body.querySelector('[data-test-subj="fixSnapshotsFlyout"]');

        expect(flyout).not.toBe(null);
        expect(flyout!.textContent).toContain('Upgrade or delete model snapshot');
      });

      test('upgrades snapshots', async () => {
        const { component } = testBed;

        const upgradeButton: HTMLButtonElement | null = flyout!.querySelector(
          '[data-test-subj="upgradeSnapshotButton"]'
        );

        httpRequestsMockHelpers.setUpgradeMlSnapshotResponse({
          nodeId: 'my_node',
          snapshotId,
          jobId,
          status: 'in_progress',
        });

        await act(async () => {
          upgradeButton!.click();
        });

        component.update();

        // First, we expect a POST request to upgrade the snapshot
        const upgradeRequest = server.requests[server.requests.length - 2];
        expect(upgradeRequest.method).toBe('POST');
        expect(upgradeRequest.url).toBe('/api/upgrade_assistant/ml_snapshots');

        // Next, we expect a GET request to check the status of the upgrade
        const statusRequest = server.requests[server.requests.length - 1];
        expect(statusRequest.method).toBe('GET');
        expect(statusRequest.url).toBe(
          `/api/upgrade_assistant/ml_snapshots/${jobId}/${snapshotId}`
        );
      });

      test('handles upgrade failure', async () => {
        const { component, find } = testBed;

        const upgradeButton: HTMLButtonElement | null = flyout!.querySelector(
          '[data-test-subj="upgradeSnapshotButton"]'
        );

        const error = {
          statusCode: 500,
          error: 'Upgrade snapshot error',
          message: 'Upgrade snapshot error',
        };

        httpRequestsMockHelpers.setUpgradeMlSnapshotResponse(undefined, error);

        await act(async () => {
          upgradeButton!.click();
        });

        component.update();

        const upgradeRequest = server.requests[server.requests.length - 1];
        expect(upgradeRequest.method).toBe('POST');
        expect(upgradeRequest.url).toBe('/api/upgrade_assistant/ml_snapshots');

        const accordionTestSubj = `depgroup_${esDeprecationsMockResponse.cluster[0].message
          .split(' ')
          .join('_')}`;

        expect(find(`${accordionTestSubj}.fixMlSnapshotsButton`).text()).toEqual('Failed');
      });

      test('deletes snapshots', async () => {
        const { component } = testBed;

        const deleteButton: HTMLButtonElement | null = flyout!.querySelector(
          '[data-test-subj="deleteSnapshotButton"]'
        );

        httpRequestsMockHelpers.setDeleteMlSnapshotResponse({
          acknowledged: true,
        });

        await act(async () => {
          deleteButton!.click();
        });

        component.update();

        const request = server.requests[server.requests.length - 1];
        const mlDeprecation = esDeprecationsMockResponse.cluster[0];

        expect(request.method).toBe('DELETE');
        expect(request.url).toBe(
          `/api/upgrade_assistant/ml_snapshots/${
            (mlDeprecation.correctiveAction! as MlAction).jobId
          }/${(mlDeprecation.correctiveAction! as MlAction).snapshotId}`
        );
      });

      test('handles delete failure', async () => {
        const { component, find } = testBed;

        const deleteButton: HTMLButtonElement | null = flyout!.querySelector(
          '[data-test-subj="deleteSnapshotButton"]'
        );

        const error = {
          statusCode: 500,
          error: 'Upgrade snapshot error',
          message: 'Upgrade snapshot error',
        };

        httpRequestsMockHelpers.setDeleteMlSnapshotResponse(undefined, error);

        await act(async () => {
          deleteButton!.click();
        });

        component.update();

        const request = server.requests[server.requests.length - 1];
        const mlDeprecation = esDeprecationsMockResponse.cluster[0];

        expect(request.method).toBe('DELETE');
        expect(request.url).toBe(
          `/api/upgrade_assistant/ml_snapshots/${
            (mlDeprecation.correctiveAction! as MlAction).jobId
          }/${(mlDeprecation.correctiveAction! as MlAction).snapshotId}`
        );

        const accordionTestSubj = `depgroup_${esDeprecationsMockResponse.cluster[0].message
          .split(' ')
          .join('_')}`;

        expect(find(`${accordionTestSubj}.fixMlSnapshotsButton`).text()).toEqual('Failed');
      });
    });
  });

  describe('no deprecations', () => {
    beforeEach(async () => {
      const noDeprecationsResponse = {
        totalCriticalDeprecations: 0,
        cluster: [],
        indices: [],
      };

      httpRequestsMockHelpers.setLoadEsDeprecationsResponse(noDeprecationsResponse);

      await act(async () => {
        testBed = await setupClusterPage({ isReadOnlyMode: false });
      });

      const { component } = testBed;

      component.update();
    });

    test('renders prompt', () => {
      const { exists, find } = testBed;
      expect(exists('noDeprecationsPrompt')).toBe(true);
      expect(find('noDeprecationsPrompt').text()).toContain('Ready to upgrade!');
    });
  });

  describe('error handling', () => {
    test('handles 403', async () => {
      const error = {
        statusCode: 403,
        error: 'Forbidden',
        message: 'Forbidden',
      };

      httpRequestsMockHelpers.setLoadEsDeprecationsResponse(undefined, error);

      await act(async () => {
        testBed = await setupClusterPage({ isReadOnlyMode: false });
      });

      const { component, exists, find } = testBed;

      component.update();

      expect(exists('permissionsError')).toBe(true);
      expect(find('permissionsError').text()).toContain(
        'You are not authorized to view Elasticsearch deprecations.'
      );
    });

    test('shows upgraded message when all nodes have been upgraded', async () => {
      const error = {
        statusCode: 426,
        error: 'Upgrade required',
        message: 'There are some nodes running a different version of Elasticsearch',
        attributes: {
          // This is marked true in the scenario where none of the nodes have the same major version of Kibana,
          // and therefore we assume all have been upgraded
          allNodesUpgraded: true,
        },
      };

      httpRequestsMockHelpers.setLoadEsDeprecationsResponse(undefined, error);

      await act(async () => {
        testBed = await setupClusterPage({ isReadOnlyMode: false });
      });

      const { component, exists, find } = testBed;

      component.update();

      expect(exists('upgradedCallout')).toBe(true);
      expect(find('upgradedCallout').text()).toContain(
        'Your configuration is up to date. Kibana and all Elasticsearch nodes are running the same version.'
      );
    });

    test('shows partially upgrade error when nodes are running different versions', async () => {
      const error = {
        statusCode: 426,
        error: 'Upgrade required',
        message: 'There are some nodes running a different version of Elasticsearch',
        attributes: {
          allNodesUpgraded: false,
        },
      };

      httpRequestsMockHelpers.setLoadEsDeprecationsResponse(undefined, error);

      await act(async () => {
        testBed = await setupClusterPage({ isReadOnlyMode: false });
      });

      const { component, exists, find } = testBed;

      component.update();

      expect(exists('partiallyUpgradedWarning')).toBe(true);
      expect(find('partiallyUpgradedWarning').text()).toContain(
        'Upgrade Kibana to the same version as your Elasticsearch cluster. One or more nodes in the cluster is running a different version than Kibana.'
      );
    });

    test('handles generic error', async () => {
      const error = {
        statusCode: 500,
        error: 'Internal server error',
        message: 'Internal server error',
      };

      httpRequestsMockHelpers.setLoadEsDeprecationsResponse(undefined, error);

      await act(async () => {
        testBed = await setupClusterPage({ isReadOnlyMode: false });
      });

      const { component, exists, find } = testBed;

      component.update();

      expect(exists('requestError')).toBe(true);
      expect(find('requestError').text()).toContain(
        'Could not retrieve Elasticsearch deprecations.'
      );
    });
  });
});

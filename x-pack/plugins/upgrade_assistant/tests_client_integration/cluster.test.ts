/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { MlAction, UpgradeAssistantStatus } from '../common/types';

import { ClusterTestBed, setupClusterPage, setupEnvironment } from './helpers';

describe('Cluster tab', () => {
  let testBed: ClusterTestBed;
  const { server, httpRequestsMockHelpers } = setupEnvironment();

  afterAll(() => {
    server.restore();
  });

  describe('with deprecations', () => {
    const upgradeStatusMockResponse: UpgradeAssistantStatus = {
      readyForUpgrade: false,
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
            snapshotId: '1',
            jobId: 'deprecation_check_job',
          },
        },
      ],
      indices: [],
    };

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadEsDeprecationsResponse(upgradeStatusMockResponse);
      httpRequestsMockHelpers.setLoadDeprecationLoggingResponse({ isEnabled: true });

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
        const accordionTestSubj = `depgroup_${upgradeStatusMockResponse.cluster[0].message
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
          acknowledged: true,
        });

        await act(async () => {
          upgradeButton!.click();
        });

        component.update();

        const request = server.requests[server.requests.length - 1];

        expect(request.method).toBe('POST');
        expect(request.url).toBe('/api/upgrade_assistant/ml_snapshots');
        expect(request.status).toEqual(200);
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
        const mlDeprecation = upgradeStatusMockResponse.cluster[0];

        expect(request.method).toBe('DELETE');
        expect(request.url).toBe(
          `/api/upgrade_assistant/ml_snapshots/${
            (mlDeprecation.correctiveAction! as MlAction).jobId
          }/${(mlDeprecation.correctiveAction! as MlAction).snapshotId}`
        );
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

    test('handles upgrade error', async () => {
      const error = {
        statusCode: 426,
        error: 'Upgrade required',
        message: 'There are some nodes running a different version of Elasticsearch',
        attributes: {
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

    test('handles partially upgrade error', async () => {
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

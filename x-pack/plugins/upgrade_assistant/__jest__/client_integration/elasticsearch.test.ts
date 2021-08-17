/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import type { MlAction, ESUpgradeStatus, EnrichedDeprecationInfo } from '../../common/types';
import { API_BASE_PATH, indexSettingDeprecations } from '../../common/constants';

import { ElasticsearchTestBed, setupElasticsearchPage, setupEnvironment } from './helpers';

describe('Elasticsearch deprecations', () => {
  let testBed: ElasticsearchTestBed;
  const { server, httpRequestsMockHelpers } = setupEnvironment();

  afterAll(() => {
    server.restore();
  });

  describe('with deprecations', () => {
    const snapshotId = '1';
    const jobId = 'deprecation_check_job';
    const upgradeStatusMockResponse: ESUpgradeStatus = {
      totalCriticalDeprecations: 2,
      deprecations: [
        {
          isCritical: true,
          resolveDuringUpgrade: false,
          type: 'ml_settings',
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
        {
          isCritical: false,
          resolveDuringUpgrade: false,
          type: 'index_settings',
          message: indexSettingDeprecations.translog.deprecationMessage,
          details: 'deprecation details',
          url: 'doc_url',
          index: 'my_index',
          correctiveAction: {
            type: 'indexSetting',
            deprecatedSettings: indexSettingDeprecations.translog.settings,
          },
        },
        {
          isCritical: false,
          resolveDuringUpgrade: false,
          type: 'index_settings',
          message: 'multi-fields within multi-fields',
          details: 'deprecation details',
          url: 'doc_url',
          index: 'nested_multi-fields',
        },
        {
          isCritical: true,
          resolveDuringUpgrade: false,
          type: 'index_settings',
          message: 'Index created before 7.0',
          details: 'deprecation details',
          url: 'doc_url',
          index: 'reindex_index',
          correctiveAction: {
            type: 'reindex',
          },
        },
      ],
    };

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadEsDeprecationsResponse(upgradeStatusMockResponse);
      httpRequestsMockHelpers.setUpgradeMlSnapshotStatusResponse({
        nodeId: 'my_node',
        snapshotId,
        jobId,
        status: 'idle',
      });

      await act(async () => {
        testBed = await setupElasticsearchPage({ isReadOnlyMode: false });
      });

      testBed.component.update();
    });

    test('renders deprecations', () => {
      const { exists, find } = testBed;
      // Verify container exists
      expect(exists('esDeprecationsContent')).toBe(true);

      // Verify all deprecations appear in the table
      expect(find('deprecationTableRow').length).toEqual(
        upgradeStatusMockResponse.deprecations.length
      );
    });

    test('refreshes deprecation data', async () => {
      const { actions } = testBed;
      const totalRequests = server.requests.length;

      await actions.clickRefreshButton();

      const mlDeprecation = upgradeStatusMockResponse.deprecations[0];
      const reindexDeprecation = upgradeStatusMockResponse.deprecations[3];

      // Since upgradeStatusMockResponse includes ML and reindex actions (which require fetching status), there will be 3 requests made
      expect(server.requests.length).toBe(totalRequests + 3);
      expect(server.requests[server.requests.length - 3].url).toBe(
        `${API_BASE_PATH}/es_deprecations`
      );
      expect(server.requests[server.requests.length - 2].url).toBe(
        `${API_BASE_PATH}/ml_snapshots/${(mlDeprecation.correctiveAction as MlAction).jobId}/${
          (mlDeprecation.correctiveAction as MlAction).snapshotId
        }`
      );
      expect(server.requests[server.requests.length - 1].url).toBe(
        `${API_BASE_PATH}/reindex/${reindexDeprecation.index}`
      );
    });

    describe('deprecation details', () => {
      describe('ML snapshots deprecation', () => {
        beforeEach(async () => {
          const { find, exists, actions } = testBed;

          await actions.clickMlDeprecationAt(0);

          expect(exists('mlSnapshotDetails')).toBe(true);
          expect(find('mlSnapshotDetails.flyoutTitle').text()).toContain(
            'Upgrade or delete model snapshot'
          );
        });

        test('upgrades snapshots', async () => {
          const { find, actions } = testBed;

          httpRequestsMockHelpers.setUpgradeMlSnapshotResponse({
            nodeId: 'my_node',
            snapshotId,
            jobId,
            status: 'in_progress',
          });

          httpRequestsMockHelpers.setUpgradeMlSnapshotStatusResponse({
            nodeId: 'my_node',
            snapshotId,
            jobId,
            status: 'complete',
          });

          expect(find('mlSnapshotDetails.upgradeSnapshotButton').text()).toEqual('Upgrade');

          await actions.clickUpgradeMlSnapshot();

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

          // Verify the "Resolution" column of the table is updated
          expect(find('mlActionResolutionCell').text()).toContain('Upgrade complete');

          // Reopen the flyout
          await actions.clickMlDeprecationAt(0);

          // Flyout actions should not be visible if deprecation was resolved
          expect(find('mlSnapshotDetails.upgradeSnapshotButton').length).toBe(0);
          expect(find('mlSnapshotDetails.deleteSnapshotButton').length).toBe(0);
        });

        test('handles upgrade failure', async () => {
          const { find, actions } = testBed;

          const error = {
            statusCode: 500,
            error: 'Upgrade snapshot error',
            message: 'Upgrade snapshot error',
          };

          httpRequestsMockHelpers.setUpgradeMlSnapshotResponse(undefined, error);
          httpRequestsMockHelpers.setUpgradeMlSnapshotStatusResponse({
            nodeId: 'my_node',
            snapshotId,
            jobId,
            status: 'error',
            error,
          });

          await actions.clickUpgradeMlSnapshot();

          const upgradeRequest = server.requests[server.requests.length - 1];
          expect(upgradeRequest.method).toBe('POST');
          expect(upgradeRequest.url).toBe('/api/upgrade_assistant/ml_snapshots');

          // Verify the "Resolution" column of the table is updated
          expect(find('mlActionResolutionCell').text()).toContain('Upgrade failed');

          // Reopen the flyout
          await actions.clickMlDeprecationAt(0);

          // Verify the flyout shows an error message
          expect(find('mlSnapshotDetails.resolveSnapshotError').text()).toContain(
            'Error upgrading snapshot'
          );
          // Verify the upgrade button text changes
          expect(find('mlSnapshotDetails.upgradeSnapshotButton').text()).toEqual('Retry upgrade');
        });

        test('deletes snapshots', async () => {
          const { find, actions } = testBed;

          httpRequestsMockHelpers.setDeleteMlSnapshotResponse({
            acknowledged: true,
          });

          expect(find('mlSnapshotDetails.deleteSnapshotButton').text()).toEqual('Delete');

          await actions.clickDeleteMlSnapshot();

          const request = server.requests[server.requests.length - 1];
          const mlDeprecation = upgradeStatusMockResponse.deprecations[0];

          expect(request.method).toBe('DELETE');
          expect(request.url).toBe(
            `/api/upgrade_assistant/ml_snapshots/${
              (mlDeprecation.correctiveAction! as MlAction).jobId
            }/${(mlDeprecation.correctiveAction! as MlAction).snapshotId}`
          );

          // Verify the "Resolution" column of the table is updated
          expect(find('mlActionResolutionCell').at(0).text()).toEqual('Deletion complete');

          // Reopen the flyout
          await actions.clickMlDeprecationAt(0);
        });

        test('handles delete failure', async () => {
          const { find, actions } = testBed;

          const error = {
            statusCode: 500,
            error: 'Upgrade snapshot error',
            message: 'Upgrade snapshot error',
          };

          httpRequestsMockHelpers.setDeleteMlSnapshotResponse(undefined, error);

          await actions.clickDeleteMlSnapshot();

          const request = server.requests[server.requests.length - 1];
          const mlDeprecation = upgradeStatusMockResponse.deprecations[0];

          expect(request.method).toBe('DELETE');
          expect(request.url).toBe(
            `/api/upgrade_assistant/ml_snapshots/${
              (mlDeprecation.correctiveAction! as MlAction).jobId
            }/${(mlDeprecation.correctiveAction! as MlAction).snapshotId}`
          );

          // Verify the "Resolution" column of the table is updated
          expect(find('mlActionResolutionCell').at(0).text()).toEqual('Deletion failed');

          // Reopen the flyout
          await actions.clickMlDeprecationAt(0);

          // Verify the flyout shows an error message
          expect(find('mlSnapshotDetails.resolveSnapshotError').text()).toContain(
            'Error deleting snapshot'
          );
          // Verify the upgrade button text changes
          expect(find('mlSnapshotDetails.deleteSnapshotButton').text()).toEqual('Retry delete');
        });
      });

      describe('index settings deprecation', () => {
        const indexSettingDeprecation = upgradeStatusMockResponse.deprecations[1];

        beforeEach(async () => {
          const { find, exists, actions } = testBed;

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

      describe('default deprecation', () => {
        it('renders a flyout with deprecation details', async () => {
          const multiFieldsDeprecation = upgradeStatusMockResponse.deprecations[2];
          const { actions, find, exists } = testBed;

          await actions.clickDefaultDeprecationAt(0);

          expect(exists('defaultDeprecationDetails')).toBe(true);
          expect(find('defaultDeprecationDetails.flyoutTitle').text()).toContain(
            multiFieldsDeprecation.message
          );
          expect(find('defaultDeprecationDetails.flyoutDescription').text()).toContain(
            multiFieldsDeprecation.index
          );
        });
      });

      describe('reindex deprecation', () => {
        it('renders a flyout with reindexing details', async () => {
          const reindexDeprecation = upgradeStatusMockResponse.deprecations[3];
          const { actions, find, exists } = testBed;

          await actions.clickReindexDeprecationAt(0);

          expect(exists('reindexDetails')).toBe(true);
          expect(find('reindexDetails.flyoutTitle').text()).toContain(
            `Reindex ${reindexDeprecation.index}`
          );
        });
      });
    });

    describe('search bar', () => {
      it('filters results by "critical" status', async () => {
        const { find, actions } = testBed;

        await actions.clickCriticalFilterButton();

        const criticalDeprecations = upgradeStatusMockResponse.deprecations.filter(
          (deprecation) => deprecation.isCritical
        );

        expect(find('deprecationTableRow').length).toEqual(criticalDeprecations.length);

        await actions.clickCriticalFilterButton();

        expect(find('deprecationTableRow').length).toEqual(
          upgradeStatusMockResponse.deprecations.length
        );
      });

      it('filters results by type', async () => {
        const { component, find, actions } = testBed;

        await actions.clickTypeFilterDropdownAt(0);

        // We need to read the document "body" as the filter dropdown options are added there and not inside
        // the component DOM tree.
        const clusterTypeFilterButton: HTMLButtonElement | null = document.body.querySelector(
          '.euiFilterSelect__items .euiFilterSelectItem'
        );

        expect(clusterTypeFilterButton).not.toBe(null);

        await act(async () => {
          clusterTypeFilterButton!.click();
        });

        component.update();

        const clusterDeprecations = upgradeStatusMockResponse.deprecations.filter(
          (deprecation) => deprecation.type === 'cluster_settings'
        );

        expect(find('deprecationTableRow').length).toEqual(clusterDeprecations.length);
      });

      it('filters results by query string', async () => {
        const { find, actions } = testBed;
        const multiFieldsDeprecation = upgradeStatusMockResponse.deprecations[3];

        await actions.setSearchInputValue(multiFieldsDeprecation.message);

        expect(find('deprecationTableRow').length).toEqual(1);
        expect(find('deprecationTableRow').at(0).text()).toContain(multiFieldsDeprecation.message);
      });

      it('shows error for invalid search queries', async () => {
        const { find, exists, actions } = testBed;

        await actions.setSearchInputValue('%');

        expect(exists('invalidSearchQueryMessage')).toBe(true);
        expect(find('invalidSearchQueryMessage').text()).toContain('Invalid search');
      });

      it('shows message when search query does not return results', async () => {
        const { find, actions, exists } = testBed;

        await actions.setSearchInputValue('foobarbaz');

        expect(exists('noDeprecationsRow')).toBe(true);
        expect(find('noDeprecationsRow').text()).toContain(
          'No Elasticsearch deprecation issues found'
        );
      });
    });

    describe('pagination', () => {
      const mlDeprecations: EnrichedDeprecationInfo[] = Array.from(
        {
          length: 20,
        },
        () => ({
          isCritical: true,
          resolveDuringUpgrade: false,
          type: 'ml_settings',
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
        })
      );

      const indexSettingsDeprecations: EnrichedDeprecationInfo[] = Array.from(
        {
          length: 20,
        },
        () => ({
          isCritical: false,
          resolveDuringUpgrade: false,
          type: 'index_settings',
          message: indexSettingDeprecations.translog.deprecationMessage,
          details: 'deprecation details',
          url: 'doc_url',
          index: 'my_index',
          correctiveAction: {
            type: 'indexSetting',
            deprecatedSettings: indexSettingDeprecations.translog.settings,
          },
        })
      );

      const reindexDeprecations: EnrichedDeprecationInfo[] = Array.from(
        {
          length: 20,
        },
        () => ({
          isCritical: true,
          resolveDuringUpgrade: false,
          type: 'index_settings',
          message: 'Index created before 7.0',
          details: 'deprecation details',
          url: 'doc_url',
          index: 'reindex_index',
          correctiveAction: {
            type: 'reindex',
          },
        })
      );

      const defaultDeprecations: EnrichedDeprecationInfo[] = Array.from(
        {
          length: 20,
        },
        () => ({
          isCritical: false,
          resolveDuringUpgrade: false,
          type: 'index_settings',
          message: 'multi-fields within multi-fields',
          details: 'deprecation details',
          url: 'doc_url',
          index: 'nested_multi-fields',
        })
      );

      const deprecations: EnrichedDeprecationInfo[] = [
        ...defaultDeprecations,
        ...reindexDeprecations,
        ...indexSettingsDeprecations,
        ...mlDeprecations,
      ];

      const upgradeStatusWithManyDeprecations: ESUpgradeStatus = {
        totalCriticalDeprecations: 40,
        deprecations,
      };

      beforeEach(async () => {
        httpRequestsMockHelpers.setLoadEsDeprecationsResponse(upgradeStatusWithManyDeprecations);
        httpRequestsMockHelpers.setUpgradeMlSnapshotStatusResponse({
          nodeId: 'my_node',
          snapshotId,
          jobId,
          status: 'idle',
        });

        await act(async () => {
          testBed = await setupElasticsearchPage({ isReadOnlyMode: false });
        });

        testBed.component.update();
      });

      it('shows the correct number of pages and deprecations per page', async () => {
        const { find, actions } = testBed;

        expect(find('esDeprecationsPagination').find('.euiPagination__item').length).toEqual(
          Math.round(deprecations.length / 50) // Default rows per page is 50
        );
        expect(find('deprecationTableRow').length).toEqual(50);

        // Navigate to the next page
        await actions.clickPaginationAt(1);

        // On the second (last) page, we expect to see the remaining deprecations
        expect(find('deprecationTableRow').length).toEqual(deprecations.length - 50);
      });

      it('allows the number of viewable rows to change', async () => {
        const { find, actions, component } = testBed;

        await actions.clickRowsPerPageDropdown();

        // We need to read the document "body" as the rows-per-page dropdown options are added there and not inside
        // the component DOM tree.
        const rowsPerPageButton: HTMLButtonElement | null = document.body.querySelector(
          '[data-test-subj="tablePagination-100-rows"]'
        );

        expect(rowsPerPageButton).not.toBe(null);

        await act(async () => {
          rowsPerPageButton!.click();
        });

        component.update();

        expect(find('esDeprecationsPagination').find('.euiPagination__item').length).toEqual(
          Math.round(deprecations.length / 100) // Rows per page is now 100
        );
        expect(find('deprecationTableRow').length).toEqual(deprecations.length);
      });

      it('updates pagination when filters change', async () => {
        const { actions, find } = testBed;

        const criticalDeprecations = deprecations.filter((deprecation) => deprecation.isCritical);

        await actions.clickCriticalFilterButton();

        // Only 40 critical deprecations, so only one page should show
        expect(find('esDeprecationsPagination').find('.euiPagination__item').length).toEqual(1);
        expect(find('deprecationTableRow').length).toEqual(criticalDeprecations.length);
      });

      it('updates pagination on search', async () => {
        const { actions, find } = testBed;

        await actions.setSearchInputValue('Index created before 7.0');

        // Only 20 deprecations that match, so only one page should show
        expect(find('esDeprecationsPagination').find('.euiPagination__item').length).toEqual(1);
        expect(find('deprecationTableRow').length).toEqual(reindexDeprecations.length);
      });
    });
  });

  describe('no deprecations', () => {
    beforeEach(async () => {
      const noDeprecationsResponse = {
        totalCriticalDeprecations: 0,
        deprecations: [],
      };

      httpRequestsMockHelpers.setLoadEsDeprecationsResponse(noDeprecationsResponse);

      await act(async () => {
        testBed = await setupElasticsearchPage({ isReadOnlyMode: false });
      });

      testBed.component.update();
    });

    test('renders prompt', () => {
      const { exists, find } = testBed;
      expect(exists('noDeprecationsPrompt')).toBe(true);
      expect(find('noDeprecationsPrompt').text()).toContain(
        'Your Elasticsearch configuration is up to date'
      );
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
        testBed = await setupElasticsearchPage({ isReadOnlyMode: false });
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
        testBed = await setupElasticsearchPage({ isReadOnlyMode: false });
      });

      const { component, exists, find } = testBed;

      component.update();

      expect(exists('upgradedCallout')).toBe(true);
      expect(find('upgradedCallout').text()).toContain(
        'All Elasticsearch nodes have been upgraded.'
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
        testBed = await setupElasticsearchPage({ isReadOnlyMode: false });
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
        testBed = await setupElasticsearchPage({ isReadOnlyMode: false });
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import type { MlAction, UpgradeAssistantStatus } from '../../common/types';
import { indexSettingDeprecations } from '../../common/constants';

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
    const upgradeStatusMockResponse: UpgradeAssistantStatus = {
      readyForUpgrade: false,
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

      // Verify links exist
      expect(exists('esDeprecationsContent.uaDocumentationLink')).toBe(true);
      expect(exists('esDeprecationsContent.snapshotRestoreLink')).toBe(true);
      expect(exists('esDeprecationsContent.esApiDocumentationLink')).toBe(true);

      // Verify all deprecations appear in the table
      expect(find('deprecationTableRow').length).toEqual(upgradeStatusMockResponse.deprecations.length);
    });

    describe('ML snapshots deprecation', () => {
      beforeEach(async () => {
        const { component, find } = testBed;

        await act(async () => {
          find('deprecation-mlSnapshot').at(0).simulate('click');
        });

        component.update();

        expect(find('mlSnapshotDetails')).not.toBe(null);
        expect(find('mlSnapshotDetails.flyoutTitle').text()).toContain(
          'Upgrade or delete model snapshot'
        );
      });

      test('upgrades snapshots', async () => {
        const { component, find } = testBed;

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

        await act(async () => {
          find('mlSnapshotDetails.upgradeSnapshotButton').simulate('click');
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

        // Verify the "Status" column of the table is updated
        expect(find('mlActionStatusCell').text()).toContain('Upgrade complete');

        // Reopen the flyout
        await act(async () => {
          find('deprecation-mlSnapshot').at(0).simulate('click');
        });

        component.update();

        // Flyout actions should not be visible if deprecation was resolved
        expect(find('mlSnapshotDetails.upgradeSnapshotButton').length).toBe(0);
        expect(find('mlSnapshotDetails.deleteSnapshotButton').length).toBe(0);
      });

      test('handles upgrade failure', async () => {
        const { component, find } = testBed;

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

        await act(async () => {
          find('mlSnapshotDetails.upgradeSnapshotButton').simulate('click');
        });

        component.update();

        const upgradeRequest = server.requests[server.requests.length - 1];
        expect(upgradeRequest.method).toBe('POST');
        expect(upgradeRequest.url).toBe('/api/upgrade_assistant/ml_snapshots');

        // Verify the "Status" column of the table is updated
        expect(find('mlActionStatusCell').text()).toContain('Upgrade failed');

        // Reopen the flyout
        await act(async () => {
          find('deprecation-mlSnapshot').at(0).simulate('click');
        });

        component.update();

        // Verify the flyout shows an error message
        expect(find('mlSnapshotDetails.resolveSnapshotError').text()).toContain(
          'Error upgrading snapshot'
        );
        // Verify the upgrade button text changes
        expect(find('mlSnapshotDetails.upgradeSnapshotButton').text()).toEqual('Retry upgrade');
      });

      test('deletes snapshots', async () => {
        const { component, find } = testBed;

        httpRequestsMockHelpers.setDeleteMlSnapshotResponse({
          acknowledged: true,
        });

        expect(find('mlSnapshotDetails.deleteSnapshotButton').text()).toEqual('Delete');

        await act(async () => {
          find('mlSnapshotDetails.deleteSnapshotButton').simulate('click');
        });

        component.update();

        const request = server.requests[server.requests.length - 1];
        const mlDeprecation = upgradeStatusMockResponse.deprecations[0];

        expect(request.method).toBe('DELETE');
        expect(request.url).toBe(
          `/api/upgrade_assistant/ml_snapshots/${
            (mlDeprecation.correctiveAction! as MlAction).jobId
          }/${(mlDeprecation.correctiveAction! as MlAction).snapshotId}`
        );

        // Verify the "Status" column of the table is updated
        expect(find('mlActionStatusCell').at(0).text()).toEqual('Deletion complete');

        // Reopen the flyout
        await act(async () => {
          find('deprecation-mlSnapshot').at(0).simulate('click');
        });

        component.update();
      });

      test('handles delete failure', async () => {
        const { component, find } = testBed;

        const error = {
          statusCode: 500,
          error: 'Upgrade snapshot error',
          message: 'Upgrade snapshot error',
        };

        httpRequestsMockHelpers.setDeleteMlSnapshotResponse(undefined, error);

        await act(async () => {
          find('mlSnapshotDetails.deleteSnapshotButton').simulate('click');
        });

        component.update();

        const request = server.requests[server.requests.length - 1];
        const mlDeprecation = upgradeStatusMockResponse.deprecations[0];

        expect(request.method).toBe('DELETE');
        expect(request.url).toBe(
          `/api/upgrade_assistant/ml_snapshots/${
            (mlDeprecation.correctiveAction! as MlAction).jobId
          }/${(mlDeprecation.correctiveAction! as MlAction).snapshotId}`
        );

        // Verify the "Status" column of the table is updated
        expect(find('mlActionStatusCell').at(0).text()).toEqual('Deletion failed');

        // Reopen the flyout
        await act(async () => {
          find('deprecation-mlSnapshot').at(0).simulate('click');
        });

        component.update();

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
        const { component, find } = testBed;


        await act(async () => {
          find('deprecation-indexSetting').at(0).simulate('click');
        });

        component.update();

        expect(find('indexSettingsDetails')).not.toBe(null);
        expect(find('indexSettingsDetails.flyoutTitle').text()).toContain(
          indexSettingDeprecation.message
        );
        expect(find('removeSettingsPrompt')).not.toBe(null);
      })

      it('removes deprecated index settings', async () => {
        const { component, find } = testBed;

        httpRequestsMockHelpers.setUpdateIndexSettingsResponse({
          acknowledged: true,
        });

        await act(async () => {
          find('deleteSettingsButton').simulate('click');
        });

        component.update();

        const request = server.requests[server.requests.length - 1];

        expect(request.method).toBe('POST');
        expect(request.url).toBe(
          `/api/upgrade_assistant/${indexSettingDeprecation.index!}/index_settings`
        );
        expect(request.status).toEqual(200);

        // Verify the "Status" column of the table is updated
        expect(find('indexSettingsActionStatusCell').at(0).text()).toEqual(
          'Deprecated settings removed'
        );

        // Reopen the flyout
        await act(async () => {
          find('deprecation-indexSetting').at(0).simulate('click');
        });

        component.update();

        // Verify prompt to remove setting no longer displays
        expect(find('removeSettingsPrompt').length).toEqual(0);
        // Verify the action button no longer displays
        expect(find('indexSettingsDetails.deleteSettingsButton').length).toEqual(0);
      });

      it('handles failure', async () => {
        const { component, find } = testBed;
        const error = {
          statusCode: 500,
          error: 'Remove index settings error',
          message: 'Remove index settings error',
        };

        httpRequestsMockHelpers.setUpdateIndexSettingsResponse(undefined, error);

        await act(async () => {
          find('deleteSettingsButton').simulate('click');
        });

        component.update();

        const request = server.requests[server.requests.length - 1];

        expect(request.method).toBe('POST');
        expect(request.url).toBe(
          `/api/upgrade_assistant/${indexSettingDeprecation.index!}/index_settings`
        );
        expect(request.status).toEqual(500);

        // Verify the "Status" column of the table is updated
        expect(find('indexSettingsActionStatusCell').at(0).text()).toEqual(
          'Settings removal failed'
        );

        // Reopen the flyout
        await act(async () => {
          find('deprecation-indexSetting').at(0).simulate('click');
        });

        component.update();

        // Verify the flyout shows an error message
        expect(find('indexSettingsDetails.deleteSettingsError').text()).toContain(
          'Error deleting index settings'
        );
        // Verify the remove settings button text changes
        expect(find('indexSettingsDetails.deleteSettingsButton').text()).toEqual('Retry removing deprecated settings');
      })
    });

    describe('default deprecation', () => {
      it('renders a flyout with deprecation details', async () => {
        const multiFieldsDeprecation = upgradeStatusMockResponse.deprecations[2];
        const { component, find } = testBed;


        await act(async () => {
          find('deprecation-default').at(0).simulate('click');
        });

        component.update();

        expect(find('defaultDeprecationDetails')).not.toBe(null);
        expect(find('defaultDeprecationDetails.flyoutTitle').text()).toContain(
          multiFieldsDeprecation.message
        );
        expect(find('defaultDeprecationDetails.flyoutDescription').text()).toContain(
          multiFieldsDeprecation.index
        );
      })
    })

    describe('reindex deprecation', () => {
      it('renders a flyout with reindexing details', async () => {
        const reindexDeprecation = upgradeStatusMockResponse.deprecations[3];
        const { component, find } = testBed;


        await act(async () => {
          find('deprecation-reindex').at(0).simulate('click');
        });

        component.update();

        expect(find('reindexDetails')).not.toBe(null);
        expect(find('reindexDetails.flyoutTitle').text()).toContain(
          `Reindex ${reindexDeprecation.index}`
        );
      })
    })
  });

  describe('no deprecations', () => {
    beforeEach(async () => {
      const noDeprecationsResponse = {
        readyForUpgrade: false,
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

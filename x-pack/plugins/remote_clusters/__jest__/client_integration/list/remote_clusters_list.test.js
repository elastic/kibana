/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';

import { getRouter } from '../../../public/application/services';
import { getRemoteClusterMock } from '../../../fixtures/remote_cluster';

import { PROXY_MODE } from '../../../common/constants';

import { setupEnvironment, getRandomString, findTestSubject } from '../helpers';

import { setup } from './remote_clusters_list.helpers';

jest.mock('@elastic/eui/lib/components/search_bar/search_box', () => {
  return {
    EuiSearchBox: (props) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockSearchBox'}
        onChange={(event) => {
          props.onSearch(event.target.value);
        }}
      />
    ),
  };
});

describe('<RemoteClusterList />', () => {
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  httpRequestsMockHelpers.setLoadRemoteClustersResponse([]);

  describe('on component mount', () => {
    let exists;

    beforeEach(async () => {
      ({ exists } = await setup(httpSetup));
    });

    test('should show a "loading remote clusters" indicator', () => {
      expect(exists('remoteClustersTableLoading')).toBe(true);
    });
  });

  describe('when there are no remote clusters', () => {
    let exists;
    let component;

    beforeEach(async () => {
      await act(async () => {
        ({ exists, component } = await setup(httpSetup));
      });

      component.update();
    });

    test('should display an empty prompt', async () => {
      expect(exists('remoteClusterListEmptyPrompt')).toBe(true);
    });

    test('should have a button to create a remote cluster', async () => {
      expect(exists('remoteClusterEmptyPromptCreateButton')).toBe(true);
    });
  });

  describe('can search', () => {
    let table;
    let component;
    let form;

    const remoteClusters = [
      {
        name: 'simple_remote_cluster',
        seeds: ['127.0.0.1:2000', '127.0.0.2:3000'],
      },
      {
        name: 'remote_cluster_with_proxy',
        proxyAddress: '192.168.0.1:80',
        mode: PROXY_MODE,
      },
    ];

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadRemoteClustersResponse(remoteClusters);

      await act(async () => {
        ({ table, component, form } = await setup(httpSetup));
      });

      component.update();
    });

    test('without any search params it should show all clusters', () => {
      const { tableCellsValues } = table.getMetaData('remoteClusterListTable');
      expect(tableCellsValues.length).toBe(2);
    });

    test('search by seed works', () => {
      form.setInputValue('remoteClusterSearch', 'simple');
      const { tableCellsValues } = table.getMetaData('remoteClusterListTable');
      expect(tableCellsValues.length).toBe(1);
    });

    test('search by proxyAddress works', () => {
      form.setInputValue('remoteClusterSearch', 'proxy');
      const { tableCellsValues } = table.getMetaData('remoteClusterListTable');
      expect(tableCellsValues.length).toBe(1);
    });
  });

  describe('when there are multiple pages of remote clusters', () => {
    let table;
    let actions;
    let component;
    let form;

    const remoteClusters = [
      {
        name: 'unique',
        seeds: [],
      },
    ];

    for (let i = 0; i < 29; i++) {
      if (i % 2 === 0) {
        remoteClusters.push({
          name: `cluster-${i}`,
          seeds: [],
        });
      } else {
        remoteClusters.push({
          name: `cluster_with_proxy-${i}`,
          proxyAddress: `127.0.0.1:10${i}`,
          mode: PROXY_MODE,
        });
      }
    }

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadRemoteClustersResponse(remoteClusters);

      await act(async () => {
        ({ table, actions, component, form } = await setup(httpSetup));
      });

      component.update();
    });

    test('pagination works', () => {
      actions.clickPaginationNextButton();
      const { tableCellsValues } = table.getMetaData('remoteClusterListTable');

      // Pagination defaults to 20 remote clusters per page. We loaded 30 remote clusters,
      // so the second page should have 10.
      expect(tableCellsValues.length).toBe(10);
    });

    test('search works', () => {
      form.setInputValue('remoteClusterSearch', 'unique');
      const { tableCellsValues } = table.getMetaData('remoteClusterListTable');
      expect(tableCellsValues.length).toBe(1);
    });
  });

  describe('when there are remote clusters', () => {
    let find;
    let exists;
    let component;
    let table;
    let actions;
    let tableCellsValues;
    let rows;

    // For deterministic tests, we need to make sure that remoteCluster1 comes before remoteCluster2
    // in the table list that is rendered. As the table orders alphabetically by index name
    // we prefix the random name to make sure that remoteCluster1 name comes before remoteCluster2.
    const remoteCluster1 = getRemoteClusterMock({ name: `a${getRandomString()}` });
    const remoteCluster2 = getRemoteClusterMock({
      name: `b${getRandomString()}`,
      isConnected: false,
      connectedSocketsCount: 0,
      proxyAddress: 'localhost:9500',
      isConfiguredByNode: true,
      mode: PROXY_MODE,
      seeds: null,
      connectedNodesCount: null,
    });
    const remoteCluster3 = getRemoteClusterMock({
      name: `c${getRandomString()}`,
      isConnected: false,
      connectedSocketsCount: 0,
      proxyAddress: 'localhost:9500',
      isConfiguredByNode: false,
      mode: PROXY_MODE,
      hasDeprecatedProxySetting: true,
      seeds: null,
      connectedNodesCount: null,
    });

    const remoteClusters = [remoteCluster1, remoteCluster2, remoteCluster3];

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadRemoteClustersResponse(remoteClusters);

      await act(async () => {
        ({ component, find, exists, table, actions } = await setup(httpSetup));
      });

      component.update();

      // Read the remote clusters list table
      ({ rows, tableCellsValues } = table.getMetaData('remoteClusterListTable'));
    });

    test('should not display the empty prompt', () => {
      expect(exists('remoteClusterListEmptyPrompt')).toBe(false);
    });

    test('should have a button to create a remote cluster', () => {
      expect(exists('remoteClusterCreateButton')).toBe(true);
    });

    test('should have link to documentation', () => {
      expect(exists('documentationLink')).toBe(true);
    });

    test('should list the remote clusters in the table', () => {
      expect(tableCellsValues.length).toEqual(remoteClusters.length);
      expect(tableCellsValues).toEqual([
        [
          '', // Empty because the first column is the checkbox to select the row
          remoteCluster1.name,
          'Connected',
          'default',
          remoteCluster1.seeds.join(', '),
          remoteCluster1.connectedNodesCount.toString(),
          '', // Empty because the last column is for the "actions" on the resource
        ],
        [
          '',
          remoteCluster2.name,
          'Not connected',
          PROXY_MODE,
          remoteCluster2.proxyAddress,
          remoteCluster2.connectedSocketsCount.toString(),
          '',
        ],
        [
          '',
          remoteCluster3.name,
          'Not connected',
          PROXY_MODE,
          remoteCluster2.proxyAddress,
          remoteCluster2.connectedSocketsCount.toString(),
          '',
        ],
      ]);
    });

    test('should have a tooltip to indicate that the cluster has been defined in elasticsearch.yml', () => {
      const secondRow = rows[1].reactWrapper; // The second cluster has been defined by node
      expect(
        findTestSubject(secondRow, 'remoteClustersTableListClusterDefinedByNodeTooltip').length
      ).toBe(1);
    });

    test('should have a tooltip to indicate that the cluster has a deprecated setting', () => {
      const secondRow = rows[2].reactWrapper; // The third cluster has been defined with deprecated setting
      expect(
        findTestSubject(secondRow, 'remoteClustersTableListClusterWithDeprecatedSettingTooltip')
          .length
      ).toBe(1);
    });

    describe('bulk delete button', () => {
      test('should be visible when a remote cluster is selected', () => {
        expect(exists('remoteClusterBulkDeleteButton')).toBe(false);

        actions.selectRemoteClusterAt(0);

        expect(exists('remoteClusterBulkDeleteButton')).toBe(true);
      });

      test('should update the button label if more than 1 remote cluster is selected', () => {
        actions.selectRemoteClusterAt(0);

        const button = find('remoteClusterBulkDeleteButton');
        expect(button.text()).toEqual('Remove remote cluster');

        actions.selectRemoteClusterAt(1);
        expect(button.text()).toEqual('Remove 2 remote clusters');
      });

      test('should open a confirmation modal when clicking on it', () => {
        expect(exists('remoteClustersDeleteConfirmModal')).toBe(false);

        actions.selectRemoteClusterAt(0);
        actions.clickBulkDeleteButton();

        expect(exists('remoteClustersDeleteConfirmModal')).toBe(true);
      });
    });

    describe('table row actions', () => {
      test('should have a "delete" and an "edit" action button on each row', () => {
        const indexLastColumn = rows[0].columns.length - 1;
        const tableCellActions = rows[0].columns[indexLastColumn].reactWrapper;

        const deleteButton = findTestSubject(tableCellActions, 'remoteClusterTableRowRemoveButton');
        const editButton = findTestSubject(tableCellActions, 'remoteClusterTableRowEditButton');

        expect(deleteButton.length).toBe(1);
        expect(editButton.length).toBe(1);
      });

      test('should open a confirmation modal when clicking on "delete" button', async () => {
        expect(exists('remoteClustersDeleteConfirmModal')).toBe(false);

        actions.clickRowActionButtonAt(0, 'delete');

        expect(exists('remoteClustersDeleteConfirmModal')).toBe(true);
      });
    });

    describe('confirmation modal (delete remote cluster)', () => {
      test('should remove the remote cluster from the table after delete is successful', async () => {
        // Mock HTTP DELETE request
        httpRequestsMockHelpers.setDeleteRemoteClusterResponse(remoteCluster1.name, {
          itemsDeleted: [remoteCluster1.name],
          errors: [],
        });

        // Make sure that we have our 3 remote clusters in the table
        expect(rows.length).toBe(3);

        actions.selectRemoteClusterAt(0);
        actions.clickBulkDeleteButton();
        actions.clickConfirmModalDeleteRemoteCluster();

        await act(async () => {
          jest.advanceTimersByTime(600); // there is a 500ms timeout in the api action
        });

        component.update();

        ({ rows } = table.getMetaData('remoteClusterListTable'));

        expect(rows.length).toBe(2);
        expect(rows[0].columns[1].value).toEqual(remoteCluster2.name);
      });
    });

    describe('detail panel', () => {
      test('should open a detail panel when clicking on a remote cluster', () => {
        expect(exists('remoteClusterDetailFlyout')).toBe(false);

        actions.clickRemoteClusterAt(0);

        expect(exists('remoteClusterDetailFlyout')).toBe(true);
      });

      test('should set the title to the remote cluster selected', () => {
        actions.clickRemoteClusterAt(0); // Select remote cluster and open the detail panel
        expect(find('remoteClusterDetailsFlyoutTitle').text()).toEqual(remoteCluster1.name);
      });

      test('should have a "Status" section', () => {
        actions.clickRemoteClusterAt(0);
        expect(find('remoteClusterDetailPanelStatusSection').find('h3').text()).toEqual('Status');
        expect(exists('remoteClusterDetailPanelStatusValues')).toBe(true);
      });

      test('should set the correct remote cluster status values', () => {
        actions.clickRemoteClusterAt(0);

        expect(find('remoteClusterDetailIsConnected').text()).toEqual('Connected');
        expect(find('remoteClusterDetailConnectedNodesCount').text()).toEqual(
          remoteCluster1.connectedNodesCount.toString()
        );
        expect(find('remoteClusterDetailSeeds').text()).toEqual(remoteCluster1.seeds.join(' '));
        expect(find('remoteClusterDetailSkipUnavailable').text()).toEqual('No');
        expect(find('remoteClusterDetailMaxConnections').text()).toEqual(
          remoteCluster1.maxConnectionsPerCluster.toString()
        );
        expect(find('remoteClusterDetailInitialConnectTimeout').text()).toEqual(
          remoteCluster1.initialConnectTimeout
        );
      });

      test('should have a "close", "delete" and "edit" button in the footer', () => {
        actions.clickRemoteClusterAt(0);
        expect(exists('remoteClusterDetailsPanelCloseButton')).toBe(true);
        expect(exists('remoteClusterDetailPanelRemoveButton')).toBe(true);
        expect(exists('remoteClusterDetailPanelEditButton')).toBe(true);
      });

      test('should close the detail panel when clicking the "close" button', () => {
        actions.clickRemoteClusterAt(0); // open the detail panel
        expect(exists('remoteClusterDetailFlyout')).toBe(true);

        find('remoteClusterDetailsPanelCloseButton').simulate('click');

        expect(exists('remoteClusterDetailFlyout')).toBe(false);
      });

      test('should open a confirmation modal when clicking the "delete" button', () => {
        actions.clickRemoteClusterAt(0);
        expect(exists('remoteClustersDeleteConfirmModal')).toBe(false);

        find('remoteClusterDetailPanelRemoveButton').simulate('click');

        expect(exists('remoteClustersDeleteConfirmModal')).toBe(true);
      });

      test('should display a "Remote cluster not found" when providing a wrong cluster name', async () => {
        expect(exists('remoteClusterDetailFlyout')).toBe(false);

        getRouter().history.replace({ search: `?cluster=wrong-cluster` });
        component.update();

        expect(exists('remoteClusterDetailFlyout')).toBe(true);
        expect(exists('remoteClusterDetailClusterNotFound')).toBe(true);
      });

      test('should display a warning when the cluster is configured by node', () => {
        actions.clickRemoteClusterAt(0); // the remoteCluster1 has *not* been configured by node
        expect(exists('remoteClusterConfiguredByNodeWarning')).toBe(false);

        actions.clickRemoteClusterAt(1); // the remoteCluster2 has been configured by node
        expect(exists('remoteClusterConfiguredByNodeWarning')).toBe(true);
      });
    });
  });
});

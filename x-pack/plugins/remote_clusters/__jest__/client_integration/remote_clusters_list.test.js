/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';

import { initTestBed, registerHttpRequestMockHelpers, nextTick, getRandomString, findTestSubject } from './test_helpers';
import { RemoteClusterList } from '../../public/sections/remote_cluster_list';
import { registerRouter, getRouter } from '../../public/services';
import { getRemoteClusterMock } from '../../fixtures/remote_cluster';

jest.mock('ui/chrome', () => ({
  addBasePath: (path) => path || '/api/remote_clusters',
  breadcrumbs: { set: () => {} },
  getInjected: (key) => {
    if (key === 'uiCapabilities') {
      return {
        navLinks: {},
        management: {},
        catalogue: {}
      };
    }
    throw new Error(`Unexpected call to chrome.getInjected with key ${key}`);
  }
}));

const testBedOptions = {
  memoryRouter: {
    onRouter: (router) => registerRouter(router)
  }
};

describe('<RemoteClusterList />', () => {
  let server;
  let find;
  let exists;
  let component;
  let getMetadataFromEuiTable;
  let getUserActions;
  let tableCellsValues;
  let rows;
  let setLoadRemoteClustersResponse;
  let setDeleteRemoteClusterResponse;

  beforeEach(() => {
    server = sinon.fakeServer.create();
    server.respondImmediately = true;
    // We make requests to APIs which don't impact the UX, e.g. UI metric telemetry,
    // and we can mock them all with a 200 instead of mocking each one individually.
    server.respondWith([200, {}, '']);

    // Register helpers to mock Http Requests
    ({ setLoadRemoteClustersResponse, setDeleteRemoteClusterResponse } = registerHttpRequestMockHelpers(server));

    // Set "default" mock responses by not providing any arguments
    setLoadRemoteClustersResponse();
  });

  describe('on component mount', () => {
    beforeEach(async () => {
      ({ exists } = initTestBed(RemoteClusterList, undefined, testBedOptions));
    });

    test('should show a "loading remote clusters" indicator', async () => {
      expect(exists('remoteClustersTableLoading')).toBe(true);
    });
  });

  describe('when there are no remote clusters', () => {
    beforeEach(async () => {
      ({ exists, component } = initTestBed(RemoteClusterList, undefined, testBedOptions));

      await nextTick(); // We need to wait next tick for the mock server response to kick in
      component.update();
    });

    test('should display an empty prompt', async () => {
      expect(exists('remoteClusterListEmptyPrompt')).toBe(true);
    });

    test('should have a button to create a remote cluster', async () => {
      expect(exists('remoteClusterEmptyPromptCreateButton')).toBe(true);
    });
  });

  describe('when there are remote clusters', async () => {
    // For deterministic tests, we need to make sure that remoteCluster1 comes before remoteCluster2
    // in the table list that is rendered. As the table orders alphabetically by index name
    // we prefix the random name to make sure that remoteCluster1 name comes before remoteCluster2.
    const remoteCluster1 = getRemoteClusterMock({ name: `a${getRandomString()}` });
    const remoteCluster2 = getRemoteClusterMock({
      name: `b${getRandomString()}`,
      isConnected: false,
      connectedNodesCount: 0,
      seeds: ['localhost:9500'],
      isConfiguredByNode: true
    });

    const remoteClusters = [remoteCluster1, remoteCluster2];

    let selectRemoteClusterAt;
    let clickBulkDeleteButton;
    let clickRowActionButtonAt;
    let clickConfirmModalDeleteRemoteCluster;
    let clickRemoteClusterAt;

    beforeEach(async () => {
      setLoadRemoteClustersResponse(remoteClusters);

      // Mount the component
      ({
        component,
        find,
        exists,
        getMetadataFromEuiTable,
        getUserActions,
      } = initTestBed(RemoteClusterList, undefined, testBedOptions));

      await nextTick(); // Make sure that the Http request is fulfilled
      component.update();

      ({
        selectRemoteClusterAt,
        clickBulkDeleteButton,
        clickRowActionButtonAt,
        clickConfirmModalDeleteRemoteCluster,
        clickRemoteClusterAt,
      } = getUserActions('remoteClusterList'));

      // Read the remote clusters list table
      ({ rows, tableCellsValues } = getMetadataFromEuiTable('remoteClusterListTable'));
    });

    test('should not display the empty prompt', () => {
      expect(exists('remoteClusterListEmptyPrompt')).toBe(false);
    });

    test('should have a button to create a remote cluster', () => {
      expect(exists('remoteClusterCreateButton')).toBe(true);
    });

    test('should list the remote clusters in the table', () => {
      expect(tableCellsValues.length).toEqual(remoteClusters.length);
      expect(tableCellsValues).toEqual([
        [ '', // Empty because the first column is the checkbox to select the row
          remoteCluster1.name,
          remoteCluster1.seeds.join(', '),
          'Connected',
          remoteCluster1.connectedNodesCount.toString(),
          '' // Empty because the last column is for the "actions" on the resource
        ], [ '',
          remoteCluster2.name,
          remoteCluster2.seeds.join(', '),
          'Not connected',
          remoteCluster2.connectedNodesCount.toString(),
          '' ]
      ]);
    });

    test('should have a tooltip to indicate that the cluster has been defined in elasticsearch.yml', () => {
      const secondRow = rows[1].reactWrapper; // The second cluster has been defined by node
      expect(findTestSubject(secondRow, 'remoteClustersTableListClusterDefinedByNodeTooltip').length).toBe(1);
    });

    describe('bulk delete button', () => {
      test('should be visible when a remote cluster is selected', () => {
        expect(exists('remoteClusterBulkDeleteButton')).toBe(false);

        selectRemoteClusterAt(0);

        expect(exists('remoteClusterBulkDeleteButton')).toBe(true);
      });

      test('should update the button label if more than 1 remote cluster is selected', () => {
        selectRemoteClusterAt(0);

        const button = find('remoteClusterBulkDeleteButton');
        expect(button.text()).toEqual('Remove remote cluster');

        selectRemoteClusterAt(1);
        expect(button.text()).toEqual('Remove 2 remote clusters');
      });

      test('should open a confirmation modal when clicking on it', () => {
        expect(exists('remoteClustersDeleteConfirmModal')).toBe(false);

        selectRemoteClusterAt(0);
        clickBulkDeleteButton();

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

        clickRowActionButtonAt(0, 'delete');

        expect(exists('remoteClustersDeleteConfirmModal')).toBe(true);
      });
    });

    describe('confirmation modal (delete remote cluster)', () => {
      test('should remove the remote cluster from the table after delete is successful', async () => {
        // Mock HTTP DELETE request
        setDeleteRemoteClusterResponse({
          itemsDeleted: [remoteCluster1.name],
          errors: [],
        });

        // Make sure that we have our 2 remote clusters in the table
        expect(rows.length).toBe(2);

        selectRemoteClusterAt(0);
        clickBulkDeleteButton();
        clickConfirmModalDeleteRemoteCluster();

        await nextTick(550); // there is a 500ms timeout in the api action
        component.update();

        ({ rows } = getMetadataFromEuiTable('remoteClusterListTable'));

        expect(rows.length).toBe(1);
        expect(rows[0].columns[1].value).toEqual(remoteCluster2.name);
      });
    });

    describe('detail panel', () => {
      test('should open a detail panel when clicking on a remote cluster', () => {
        expect(exists('remoteClusterDetailFlyout')).toBe(false);

        clickRemoteClusterAt(0);

        expect(exists('remoteClusterDetailFlyout')).toBe(true);
      });

      test('should set the title to the remote cluster selected', () => {
        clickRemoteClusterAt(0); // Select remote cluster and open the detail panel
        expect(find('remoteClusterDetailsFlyoutTitle').text()).toEqual(remoteCluster1.name);
      });

      test('should have a "Status" section', () => {
        clickRemoteClusterAt(0);
        expect(find('remoteClusterDetailPanelStatusSection').find('h3').text()).toEqual('Status');
        expect(exists('remoteClusterDetailPanelStatusValues')).toBe(true);
      });

      test('should set the correct remote cluster status values', () => {
        clickRemoteClusterAt(0);

        expect(find('remoteClusterDetailIsConnected').text()).toEqual('Connected');
        expect(find('remoteClusterDetailConnectedNodesCount').text()).toEqual(remoteCluster1.connectedNodesCount.toString());
        expect(find('remoteClusterDetailSeeds').text()).toEqual(remoteCluster1.seeds.join(' '));
        expect(find('remoteClusterDetailSkipUnavailable').text()).toEqual('No');
        expect(find('remoteClusterDetailMaxConnections').text()).toEqual(remoteCluster1.maxConnectionsPerCluster.toString());
        expect(find('remoteClusterDetailInitialConnectTimeout').text()).toEqual(remoteCluster1.initialConnectTimeout);
      });

      test('should have a "close", "delete" and "edit" button in the footer', () => {
        clickRemoteClusterAt(0);
        expect(exists('remoteClusterDetailsPanelCloseButton')).toBe(true);
        expect(exists('remoteClusterDetailPanelRemoveButton')).toBe(true);
        expect(exists('remoteClusterDetailPanelEditButton')).toBe(true);
      });

      test('should close the detail panel when clicking the "close" button', () => {
        clickRemoteClusterAt(0); // open the detail panel
        expect(exists('remoteClusterDetailFlyout')).toBe(true);

        find('remoteClusterDetailsPanelCloseButton').simulate('click');

        expect(exists('remoteClusterDetailFlyout')).toBe(false);
      });

      test('should open a confirmation modal when clicking the "delete" button', () => {
        clickRemoteClusterAt(0);
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
        clickRemoteClusterAt(0); // the remoteCluster1 has *not* been configured by node
        expect(exists('remoteClusterConfiguredByNodeWarning')).toBe(false);

        clickRemoteClusterAt(1); // the remoteCluster2 has been configured by node
        expect(exists('remoteClusterConfiguredByNodeWarning')).toBe(true);
      });
    });
  });
});

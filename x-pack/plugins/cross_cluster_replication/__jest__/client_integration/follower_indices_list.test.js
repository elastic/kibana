/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';

import { initTestBed, registerHttpRequestMockHelpers, nextTick, getRandomString } from './test_helpers';
import { FollowerIndicesList } from '../../public/app/sections/home/follower_indices_list';
import { getFollowerIndexMock } from '../../fixtures/follower_index';

jest.mock('ui/chrome', () => ({
  addBasePath: () => 'api/cross_cluster_replication',
  breadcrumbs: { set: () => {} },
}));

jest.mock('ui/index_patterns', () => {
  const { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE } = require.requireActual('../../../../../src/legacy/ui/public/index_patterns/constants'); // eslint-disable-line max-len
  return { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE };
});

describe('<FollowerIndicesList />', () => {
  let server;
  let find;
  let exists;
  let component;
  let getMetadataFromEuiTable;
  let getUserActions;
  let tableCellsValues;
  let setLoadFollowerIndicesResponse;

  beforeEach(() => {
    server = sinon.fakeServer.create();
    server.respondImmediately = true;

    // Register helpers to mock Http Requests
    ({ setLoadFollowerIndicesResponse } = registerHttpRequestMockHelpers(server));

    // Set "default" mock responses by not providing any arguments
    setLoadFollowerIndicesResponse();
  });

  describe('on component mount', () => {
    beforeEach(async () => {
      ({ exists } = initTestBed(FollowerIndicesList));
    });

    test('should show a loading indicator on component', async () => {
      expect(exists('ccrFollowerIndexLoading')).toBe(true);
    });
  });

  describe('when there are no follower indices', () => {
    beforeEach(async () => {
      ({ exists, component } = initTestBed(FollowerIndicesList));

      await nextTick(); // We need to wait next tick for the mock server response to comes in
      component.update();
    });

    test('should display an empty prompt', async () => {
      expect(exists('ccrFollowerIndexEmptyPrompt')).toBe(true);
    });

    test('should have a button to create a follower index', async () => {
      expect(exists('ccrFollowerIndexEmptyPromptCreateButton')).toBe(true);
    });
  });

  describe('when there are follower indices', async () => {
    // For deterministic tests, we need to make sure that index1 comes before index2
    // in the table list that is rendered. As the table orders alphabetically by index name
    // we prefix the random name to make sure that index1 name comes before index2.
    const index1 = getFollowerIndexMock({ name: `a${getRandomString()}` });
    const index2 = getFollowerIndexMock({ name: `b${getRandomString()}`, status: 'paused' });

    const followerIndices = [index1, index2];

    let selectFollowerIndexAt;
    let openContextMenu;
    let openTableRowContextMenuAt;
    let clickContextMenuButtonAt;
    let clickFollowerIndexAt;

    beforeEach(async () => {
      setLoadFollowerIndicesResponse({ indices: followerIndices });

      // Mount the component
      ({
        find,
        exists,
        component,
        getMetadataFromEuiTable,
        getUserActions,
      } = initTestBed(FollowerIndicesList));

      await nextTick(); // Make sure that the Http request is fulfilled
      component.update();

      ({
        selectFollowerIndexAt,
        openContextMenu,
        openTableRowContextMenuAt,
        clickContextMenuButtonAt,
        clickFollowerIndexAt,
      } = getUserActions('followerIndicesList'));

      // Read the index list table
      ({ tableCellsValues } = getMetadataFromEuiTable('ccrFollowerIndexListTable'));
    });

    afterEach(async () => {
      // The <EuiPopover /> updates are not all synchronouse
      // We need to wait for all the updates to ran before unmounting our component
      await nextTick(100);
    });

    test('should not display the empty prompt', () => {
      expect(exists('ccrFollowerIndexEmptyPrompt')).toBe(false);
    });

    test('should have a button to create a follower index', () => {
      expect(exists('ccrCreateFollowerIndexButton')).toBe(true);
    });

    test('should list the follower indices in the table', () => {
      expect(tableCellsValues.length).toEqual(followerIndices.length);
      expect(tableCellsValues).toEqual([
        [ '', // Empty because the first column is the checkbox to select row
          index1.name,
          'Active',
          index1.remoteCluster,
          index1.leaderIndex,
          '' // Empty because the last column is for the "actions" on the resource
        ], [ '',
          index2.name,
          'Paused',
          index2.remoteCluster,
          index2.leaderIndex,
          '' ]
      ]);
    });

    describe('action menu', () => {
      test('should be visible when a follower index is selected', () => {
        expect(exists('ccrFollowerIndexListContextMenuButton')).toBe(false);

        selectFollowerIndexAt(0);

        expect(exists('ccrFollowerIndexListContextMenuButton')).toBe(true);
      });

      test('should have a "pause", "edit" and "unfollow" action when the follower index is active', async () => {
        selectFollowerIndexAt(0);
        openContextMenu();

        const contextMenu = find('followerIndexActionContextMenu');

        expect(contextMenu.length).toBeTruthy();
        const contextMenuButtons = contextMenu.find('button');
        const buttonsLabel = contextMenuButtons.map(btn => btn.text());

        expect(buttonsLabel).toEqual([
          'Pause replication',
          'Edit follower index',
          'Unfollow leader index'
        ]);
      });

      test('should have a "resume", "edit" and "unfollow" action when the follower index is active', async () => {
        selectFollowerIndexAt(1); // Select the second follower that is "paused"
        openContextMenu();

        const contextMenu = find('followerIndexActionContextMenu');

        const contextMenuButtons = contextMenu.find('button');
        const buttonsLabel = contextMenuButtons.map(btn => btn.text());
        expect(buttonsLabel).toEqual([
          'Resume replication',
          'Edit follower index',
          'Unfollow leader index'
        ]);
      });

      test('should open a confirmation modal when clicking on "pause replication"', () => {
        expect(exists('ccrFollowerIndexPauseReplicationConfirmationModal')).toBe(false);

        selectFollowerIndexAt(0);
        openContextMenu();
        clickContextMenuButtonAt(0); // first button is the "pause" action

        expect(exists('ccrFollowerIndexPauseReplicationConfirmationModal')).toBe(true);
      });

      test('should open a confirmation modal when clicking on "unfollow leader index"', () => {
        expect(exists('ccrFollowerIndexUnfollowLeaderConfirmationModal')).toBe(false);

        selectFollowerIndexAt(0);
        openContextMenu();
        clickContextMenuButtonAt(2); // third button is the "unfollow" action

        expect(exists('ccrFollowerIndexUnfollowLeaderConfirmationModal')).toBe(true);
      });
    });

    describe('table row action menu', () => {
      test('should open a context menu when clicking on the button of each row', async () => {
        expect(component.find('.euiContextMenuPanel').length).toBe(0);

        openTableRowContextMenuAt(0);

        expect(component.find('.euiContextMenuPanel').length).toBe(1);
      });

      test('should have the "pause", "edit" and "unfollow" options in the row context menu', async () => {
        openTableRowContextMenuAt(0);

        const buttonLabels = component
          .find('.euiContextMenuPanel')
          .find('.euiContextMenuItem')
          .map(button => button.text());

        expect(buttonLabels).toEqual([
          'Pause replication',
          'Edit follower index',
          'Unfollow leader index'
        ]);
      });

      test('should have the "resume", "edit" and "unfollow" options in the row context menu', async () => {
        // We open the context menu of the second row (index 1) as followerIndices[1].status is "paused"
        openTableRowContextMenuAt(1);

        const buttonLabels = component
          .find('.euiContextMenuPanel')
          .find('.euiContextMenuItem')
          .map(button => button.text());

        expect(buttonLabels).toEqual([
          'Resume replication',
          'Edit follower index',
          'Unfollow leader index'
        ]);
      });

      test('should open a confirmation modal when clicking on "pause replication"', async () => {
        expect(exists('ccrFollowerIndexPauseReplicationConfirmationModal')).toBe(false);

        openTableRowContextMenuAt(0);
        find('ccrFollowerIndexListPauseActionButton').simulate('click');

        expect(exists('ccrFollowerIndexPauseReplicationConfirmationModal')).toBe(true);
      });

      test('should open a confirmation modal when clicking on "resume"', async () => {
        expect(exists('ccrFollowerIndexResumeReplicationConfirmationModal')).toBe(false);

        openTableRowContextMenuAt(1); // open the second row context menu, as it is a "paused" follower index
        find('ccrFollowerIndexListResumeActionButton').simulate('click');

        expect(exists('ccrFollowerIndexResumeReplicationConfirmationModal')).toBe(true);
      });

      test('should open a confirmation modal when clicking on "unfollow leader index"', () => {
        expect(exists('ccrFollowerIndexUnfollowLeaderConfirmationModal')).toBe(false);

        openTableRowContextMenuAt(0);
        find('ccrFollowerIndexListUnfollowActionButton').simulate('click');

        expect(exists('ccrFollowerIndexUnfollowLeaderConfirmationModal')).toBe(true);
      });
    });

    describe('detail panel', () => {
      test('should open a detail panel when clicking on a follower index', () => {
        expect(exists('ccrFollowerIndexDetailsFlyout')).toBe(false);

        clickFollowerIndexAt(0);

        expect(exists('ccrFollowerIndexDetailsFlyout')).toBe(true);
      });

      test('should set the title the index that has been selected', () => {
        clickFollowerIndexAt(0); // Open the detail panel
        expect(find('followerIndexDetailsFlyoutTitle').text()).toEqual(index1.name);
      });

      test('should have a "settings" section', () => {
        clickFollowerIndexAt(0);
        expect(find('ccrFollowerIndexDetailPanelSettingsSection').find('h3').text()).toEqual('Settings');
        expect(exists('ccrFollowerIndexDetailPanelSettingsValues')).toBe(true);
      });

      test('should set the correct follower index settings values', () => {
        const mapSettingsToFollowerIndexProp = {
          Status: 'status',
          RemoteCluster: 'remoteCluster',
          LeaderIndex: 'leaderIndex',
          MaxReadReqOpCount: 'maxReadRequestOperationCount',
          MaxOutstandingReadReq: 'maxOutstandingReadRequests',
          MaxReadReqSize: 'maxReadRequestSize',
          MaxWriteReqOpCount: 'maxWriteRequestOperationCount',
          MaxWriteReqSize: 'maxWriteRequestSize',
          MaxOutstandingWriteReq: 'maxOutstandingWriteRequests',
          MaxWriteBufferCount: 'maxWriteBufferCount',
          MaxWriteBufferSize: 'maxWriteBufferSize',
          MaxRetryDelay: 'maxRetryDelay',
          ReadPollTimeout: 'readPollTimeout'
        };

        clickFollowerIndexAt(0);

        Object.entries(mapSettingsToFollowerIndexProp).forEach(([setting, prop]) => {
          const wrapper = find(`ccrFollowerIndexDetail${setting}`);

          if (!wrapper.length) {
            throw new Error(`Could not find description for setting "${setting}"`);
          }

          expect(wrapper.text()).toEqual(index1[prop].toString());
        });
      });

      test('should not have settings values for a "paused" follower index', () => {
        clickFollowerIndexAt(1); // the second follower index is paused
        expect(exists('ccrFollowerIndexDetailPanelSettingsValues')).toBe(false);
        expect(find('ccrFollowerIndexDetailPanelSettingsSection').text()).toContain('paused follower index does not have settings');
      });

      test('should have a section to render the follower index shards stats', () => {
        clickFollowerIndexAt(0);
        expect(exists('ccrFollowerIndexDetailPanelShardsStatsSection')).toBe(true);
      });

      test('should render a EuiCodeEditor for each shards stats', () => {
        clickFollowerIndexAt(0);

        const codeEditors = component.find(`EuiCodeEditor`);

        expect(codeEditors.length).toBe(index1.shards.length);
        codeEditors.forEach((codeEditor, i) => {
          expect(JSON.parse(codeEditor.props().value)).toEqual(index1.shards[i]);
        });
      });
    });
  });
});

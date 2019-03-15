/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';

import { initTestBed, mockServerResponses, nextTick } from './test_helpers';
import { FollowerIndicesList } from '../../public/app/sections/home/follower_indices_list';

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
  let mockLoadFollowerIndices;

  beforeEach(() => {
    server = sinon.fakeServer.create();
    server.respondImmediately = true;
    ({ mockLoadFollowerIndices } = mockServerResponses(server));
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
    const followerIndices = [{
      name: 'follower-index-1',
      remoteCluster: 'new-york',
      leaderIndex: 'leader-index-1',
      status: 'started'
    }, {
      name: 'follower-index-2',
      remoteCluster: 'paris',
      leaderIndex: 'leader-index-2',
      status: 'paused'
    }];

    let selectFollowerIndexAt;
    let openContextMenu;
    let openContextMenuTableRowAt;

    beforeEach(async () => {
      // Mock Http Request that loads Follower indices
      mockLoadFollowerIndices({ indices: followerIndices });

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
        openContextMenuTableRowAt,
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
        [ '', // First column is the checkbox to select row
          'follower-index-1',
          'Active',
          'new-york',
          'leader-index-1',
          '' // Last column is for the "actions" on the resource
        ], [ '',
          'follower-index-2',
          'Paused',
          'paris',
          'leader-index-2',
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
    });

    describe('table row action menu', () => {
      test('should open a context menu when clicking on the button of each row', async () => {
        expect(component.find('.euiContextMenuPanel').length).toBe(0);

        openContextMenuTableRowAt(0);

        expect(component.find('.euiContextMenuPanel').length).toBe(1);
      });

      test('should have the "pause", "edit" and "unfollow" options in the row context menu', async () => {
        openContextMenuTableRowAt(0);

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
        openContextMenuTableRowAt(1);

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
    });
  });
});

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
  // let userActions;
  // let getFormErrorsMessages;
  // let form;
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

    let rows;
    let tableCellsValues;

    beforeEach(async () => {
      // Mock Http Request that loads Follower indices
      mockLoadFollowerIndices({ indices: followerIndices });

      // Mount the component
      ({
        find,
        exists,
        component,
        getMetadataFromEuiTable
      } = initTestBed(FollowerIndicesList));

      // Make sure that the Http request is fulfilled
      await nextTick();
      component.update();

      // Read the index list table
      ({ rows, tableCellsValues } = getMetadataFromEuiTable('ccrFollowerIndexListTable'));
    });

    afterEach(async () => {
      // The <EuiPopover /> sets a Timeout on update
      // https://github.com/elastic/eui/blob/master/src/components/popover/popover.js#L228
      // We need for it to have ran before unmounting our component
      await nextTick();
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
      const selectFollowerIndex = (index = 0) => {
        const row = rows[index];
        const checkBox = row.reactWrapper.find('input').hostNodes();
        checkBox.simulate('change', { target: { checked: true } });
      };

      test('should be visible when a follower index is selected', () => {
        expect(exists('ccrFollowerIndexListContextMenuButton')).toBe(false);

        selectFollowerIndex();

        expect(exists('ccrFollowerIndexListContextMenuButton')).toBe(true);
      });

      test('should have a "pause", "edit" and "unfollow" action when the follower index is active', async () => {
        // Select a follower index
        selectFollowerIndex();

        // open the context menu
        find('ccrFollowerIndexListContextMenuButton').simulate('click');

        const contextMenu = find('followerIndexActionContextMenu');

        expect(contextMenu.length).toBeTruthy();
        const contextMenuButtons = contextMenu.find('button');
        const buttonsLabel = contextMenuButtons.map(btn => btn.text());

        expect(buttonsLabel).toEqual([
          'Pause replication',
          'Edit follower index',
          'Unfollow leader index'
        ]);

        await nextTick();
      });

      test('should have a "resume", "edit" and "unfollow" action when the follower index is active', async () => {
        // Select the second follower that is "paused"
        selectFollowerIndex(1);

        // open the context menu
        const button = find('ccrFollowerIndexListContextMenuButton');
        button.simulate('click');

        const contextMenu = find('followerIndexActionContextMenu');

        expect(contextMenu.length).toBeTruthy();
        const contextMenuButtons = contextMenu.find('button');
        const buttonsLabel = contextMenuButtons.map(btn => btn.text());
        expect(buttonsLabel).toEqual([
          'Resume replication',
          'Edit follower index',
          'Unfollow leader index'
        ]);

        await nextTick();
      });
    });
  });
});

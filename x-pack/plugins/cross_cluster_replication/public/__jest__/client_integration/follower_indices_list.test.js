/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The below import is required to avoid a console error warn from brace package
 * console.warn ../node_modules/brace/index.js:3999
      Could not load worker ReferenceError: Worker is not defined
          at createWorker (/<path-to-repo>/node_modules/brace/index.js:17992:5)
 */
import { stubWebWorker } from '@kbn/test/jest'; // eslint-disable-line no-unused-vars
import { act } from 'react-dom/test-utils';

import { getFollowerIndexMock } from './fixtures/follower_index';
import './mocks';
import { setupEnvironment, pageHelpers, getRandomString } from './helpers';

const { setup } = pageHelpers.followerIndexList;

describe('<FollowerIndicesList />', () => {
  let httpRequestsMockHelpers;

  beforeAll(() => {
    jest.useFakeTimers();
    ({ httpRequestsMockHelpers } = setupEnvironment());
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    // Set "default" mock responses by not providing any arguments
    httpRequestsMockHelpers.setLoadFollowerIndicesResponse();
  });

  describe('on component mount', () => {
    let exists;
    let component;

    beforeEach(async () => {
      ({ exists, component } = await setup());
      component.update();
    });

    test('should show a loading indicator on component', () => {
      expect(exists('sectionLoading')).toBe(true);
    });
  });

  describe('when there are no follower indices', () => {
    let exists;
    let component;

    beforeEach(async () => {
      await act(async () => {
        ({ exists, component } = await setup());
      });

      component.update();
    });

    test('should display an empty prompt', () => {
      expect(exists('emptyPrompt')).toBe(true);
    });

    test('should have a button to create a follower index', () => {
      expect(exists('emptyPrompt.createFollowerIndexButton')).toBe(true);
    });
  });

  describe('when there are multiple pages of follower indices', () => {
    let component;
    let table;
    let actions;
    let form;

    const followerIndices = [
      {
        name: 'unique',
        seeds: [],
      },
    ];

    for (let i = 0; i < 29; i++) {
      followerIndices.push({
        name: `name${i}`,
        seeds: [],
      });
    }

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadFollowerIndicesResponse({ indices: followerIndices });

      await act(async () => {
        ({ component, table, actions, form } = await setup());
      });

      component.update();
    });

    test('pagination works', async () => {
      await actions.clickPaginationNextButton();
      const { tableCellsValues } = table.getMetaData('followerIndexListTable');

      // Pagination defaults to 20 follower indices per page. We loaded 30 follower indices,
      // so the second page should have 10.
      expect(tableCellsValues.length).toBe(10);
    });

    test('search works', () => {
      form.setInputValue('followerIndexSearch', 'unique');
      const { tableCellsValues } = table.getMetaData('followerIndexListTable');
      expect(tableCellsValues.length).toBe(1);
    });
  });

  describe('when there are follower indices', () => {
    let find;
    let exists;
    let component;
    let table;
    let actions;
    let tableCellsValues;

    // For deterministic tests, we need to make sure that index1 comes before index2
    // in the table list that is rendered. As the table orders alphabetically by index name
    // we prefix the random name to make sure that index1 name comes before index2.
    const index1 = getFollowerIndexMock({ name: `a${getRandomString()}` });
    const index2 = getFollowerIndexMock({ name: `b${getRandomString()}`, status: 'paused' });

    const followerIndices = [index1, index2];

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadFollowerIndicesResponse({ indices: followerIndices });

      // Mount the component
      await act(async () => {
        ({ find, exists, component, table, actions } = await setup());
      });

      component.update();

      // Read the index list table
      ({ tableCellsValues } = table.getMetaData('followerIndexListTable'));
    });

    test('should not display the empty prompt', () => {
      expect(exists('emptyPrompt')).toBe(false);
    });

    test('should have a button to create a follower index', () => {
      expect(exists('createFollowerIndexButton')).toBe(true);
    });

    test('should list the follower indices in the table', () => {
      expect(tableCellsValues.length).toEqual(followerIndices.length);
      expect(tableCellsValues).toEqual([
        [
          '', // Empty because the first column is the checkbox to select row
          index1.name,
          'Active',
          index1.remoteCluster,
          index1.leaderIndex,
          '', // Empty because the last column is for the "actions" on the resource
        ],
        ['', index2.name, 'Paused', index2.remoteCluster, index2.leaderIndex, ''],
      ]);
    });

    describe('action menu', () => {
      test('should be visible when a follower index is selected', async () => {
        expect(exists('contextMenuButton')).toBe(false);

        await actions.selectFollowerIndexAt(0);

        expect(exists('contextMenuButton')).toBe(true);
      });

      test('should have a "pause", "edit" and "unfollow" action when the follower index is active', async () => {
        await actions.selectFollowerIndexAt(0);
        await actions.openContextMenu();

        const contextMenu = find('contextMenu');

        expect(contextMenu.length).toBe(1);
        const contextMenuButtons = contextMenu.find('button');
        const buttonsLabel = contextMenuButtons.map((btn) => btn.text());

        expect(buttonsLabel).toEqual([
          'Pause replication',
          'Edit follower index',
          'Unfollow leader index',
        ]);
      });

      test('should have a "resume", "edit" and "unfollow" action when the follower index is active', async () => {
        await actions.selectFollowerIndexAt(1); // Select the second follower that is "paused"
        await actions.openContextMenu();

        const contextMenu = find('contextMenu');

        const contextMenuButtons = contextMenu.find('button');
        const buttonsLabel = contextMenuButtons.map((btn) => btn.text());
        expect(buttonsLabel).toEqual([
          'Resume replication',
          'Edit follower index',
          'Unfollow leader index',
        ]);
      });

      test('should open a confirmation modal when clicking on "pause replication"', async () => {
        expect(exists('pauseReplicationConfirmation')).toBe(false);

        await actions.selectFollowerIndexAt(0);
        await actions.openContextMenu();
        await actions.clickContextMenuButtonAt(0); // first button is the "pause" action

        expect(exists('pauseReplicationConfirmation')).toBe(true);
      });

      test('should open a confirmation modal when clicking on "unfollow leader index"', async () => {
        expect(exists('unfollowLeaderConfirmation')).toBe(false);

        await actions.selectFollowerIndexAt(0);
        await actions.openContextMenu();
        await actions.clickContextMenuButtonAt(2); // third button is the "unfollow" action

        expect(exists('unfollowLeaderConfirmation')).toBe(true);
      });
    });

    describe('table row action menu', () => {
      test('should open a context menu when clicking on the button of each row', async () => {
        expect(component.find('.euiContextMenuPanel').length).toBe(0);

        await actions.openTableRowContextMenuAt(0);

        expect(component.find('.euiContextMenuPanel').length).toBe(1);
      });

      test('should have the "pause", "edit" and "unfollow" options in the row context menu', async () => {
        await actions.openTableRowContextMenuAt(0);

        const buttonLabels = component
          .find('.euiContextMenuPanel')
          .find('.euiContextMenuItem')
          .map((button) => button.text());

        expect(buttonLabels).toEqual([
          'Pause replication',
          'Edit follower index',
          'Unfollow leader index',
        ]);
      });

      test('should have the "resume", "edit" and "unfollow" options in the row context menu', async () => {
        // We open the context menu of the second row (index 1) as followerIndices[1].status is "paused"
        await actions.openTableRowContextMenuAt(1);

        const buttonLabels = component
          .find('.euiContextMenuPanel')
          .find('.euiContextMenuItem')
          .map((button) => button.text());

        expect(buttonLabels).toEqual([
          'Resume replication',
          'Edit follower index',
          'Unfollow leader index',
        ]);
      });

      test('should open a confirmation modal when clicking on "pause replication"', async () => {
        expect(exists('pauseReplicationConfirmation')).toBe(false);

        await actions.openTableRowContextMenuAt(0);

        await act(async () => {
          find('pauseButton').simulate('click');
        });

        component.update();

        expect(exists('pauseReplicationConfirmation')).toBe(true);
      });

      test('should open a confirmation modal when clicking on "resume"', async () => {
        expect(exists('resumeReplicationConfirmation')).toBe(false);

        await actions.openTableRowContextMenuAt(1); // open the second row context menu, as it is a "paused" follower index

        await act(async () => {
          find('resumeButton').simulate('click');
        });

        component.update();

        expect(exists('resumeReplicationConfirmation')).toBe(true);
      });

      test('should open a confirmation modal when clicking on "unfollow leader index"', async () => {
        expect(exists('unfollowLeaderConfirmation')).toBe(false);

        await actions.openTableRowContextMenuAt(0);

        await act(async () => {
          find('unfollowButton').simulate('click');
        });

        component.update();

        expect(exists('unfollowLeaderConfirmation')).toBe(true);
      });
    });

    describe('detail panel', () => {
      test('should open a detail panel when clicking on a follower index', async () => {
        expect(exists('followerIndexDetail')).toBe(false);

        await actions.clickFollowerIndexAt(0);

        expect(exists('followerIndexDetail')).toBe(true);
      });

      test('should set the title the index that has been selected', async () => {
        await actions.clickFollowerIndexAt(0); // Open the detail panel
        expect(find('followerIndexDetail.title').text()).toEqual(index1.name);
      });

      test('should indicate the correct "status", "remote cluster" and "leader index"', async () => {
        await actions.clickFollowerIndexAt(0);
        expect(find('followerIndexDetail.status').text()).toEqual(index1.status);
        expect(find('followerIndexDetail.remoteCluster').text()).toEqual(index1.remoteCluster);
        expect(find('followerIndexDetail.leaderIndex').text()).toEqual(index1.leaderIndex);
      });

      test('should have a "settings" section', async () => {
        await actions.clickFollowerIndexAt(0);
        expect(find('followerIndexDetail.settingsSection').find('h3').text()).toEqual('Settings');
        expect(exists('followerIndexDetail.settingsValues')).toBe(true);
      });

      test('should set the correct follower index settings values', async () => {
        const mapSettingsToFollowerIndexProp = {
          maxReadReqOpCount: 'maxReadRequestOperationCount',
          maxOutstandingReadReq: 'maxOutstandingReadRequests',
          maxReadReqSize: 'maxReadRequestSize',
          maxWriteReqOpCount: 'maxWriteRequestOperationCount',
          maxWriteReqSize: 'maxWriteRequestSize',
          maxOutstandingWriteReq: 'maxOutstandingWriteRequests',
          maxWriteBufferCount: 'maxWriteBufferCount',
          maxWriteBufferSize: 'maxWriteBufferSize',
          maxRetryDelay: 'maxRetryDelay',
          readPollTimeout: 'readPollTimeout',
        };

        await actions.clickFollowerIndexAt(0);

        Object.entries(mapSettingsToFollowerIndexProp).forEach(([setting, prop]) => {
          const wrapper = find(`settingsValues.${setting}`);

          if (!wrapper.length) {
            throw new Error(`Could not find description for setting "${setting}"`);
          }

          expect(wrapper.text()).toEqual(index1[prop].toString());
        });
      });

      test('should not have settings values for a "paused" follower index', async () => {
        await actions.clickFollowerIndexAt(1); // the second follower index is paused
        expect(exists('followerIndexDetail.settingsValues')).toBe(false);
        expect(find('followerIndexDetail.settingsSection').text()).toContain(
          'paused follower index does not have settings'
        );
      });

      test('should have a section to render the follower index shards stats', async () => {
        await actions.clickFollowerIndexAt(0);
        expect(exists('followerIndexDetail.shardsStatsSection')).toBe(true);

        const codeBlocks = find('shardsStats');

        expect(codeBlocks.length).toBe(index1.shards.length);
        codeBlocks.forEach((codeBlock, i) => {
          expect(JSON.parse(codeBlock.props().children)).toEqual(index1.shards[i]);
        });
      });
    });
  });
});

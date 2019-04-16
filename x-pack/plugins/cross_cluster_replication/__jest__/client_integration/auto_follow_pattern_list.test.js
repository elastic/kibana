/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setupEnvironment, pageHelpers, nextTick, findTestSubject, getRandomString } from './helpers';

import { getAutoFollowPatternClientMock } from '../../fixtures/auto_follow_pattern';

jest.mock('ui/chrome', () => ({
  addBasePath: () => 'api/cross_cluster_replication',
  breadcrumbs: { set: () => {} },
}));

jest.mock('ui/index_patterns', () => {
  const { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE } =
    require.requireActual('../../../../../src/legacy/ui/public/index_patterns/constants');
  return { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE };
});

const { setup } = pageHelpers.autoFollowPatternList;

describe('<AutoFollowPatternList />', () => {
  let server;
  let httpRequestsMockHelpers;

  beforeAll(() => {
    ({ server, httpRequestsMockHelpers } = setupEnvironment());
  });

  afterAll(() => {
    server.restore();
  });

  beforeEach(() => {
    // Set "default" mock responses by not providing any arguments
    httpRequestsMockHelpers.setLoadAutoFollowPatternsResponse();
    httpRequestsMockHelpers.setDeleteAutoFollowPatternResponse();
    httpRequestsMockHelpers.setAutoFollowStatsResponse();
  });

  describe('on component mount', () => {
    let exists;

    beforeEach(async () => {
      ({ exists } = setup());
    });

    test('should show a loading indicator on component', async () => {
      expect(exists('ccrAutoFollowPatternLoading')).toBe(true);
    });
  });

  describe('when there are no auto-follow patterns', () => {
    let exists;
    let component;

    beforeEach(async () => {
      ({ exists, component } = setup());

      await nextTick(); // We need to wait next tick for the mock server response to comes in
      component.update();
    });

    test('should display an empty prompt', async () => {
      expect(exists('ccrAutoFollowPatternEmptyPrompt')).toBe(true);
    });

    test('should have a button to create a follower index', async () => {
      expect(exists('ccrCreateAutoFollowPatternButton')).toBe(true);
    });
  });

  describe('when there are auto-follow patterns', async () => {
    let find;
    let exists;
    let component;
    let table;
    let actions;
    let tableCellsValues;
    let rows;

    // For deterministic tests, we need to make sure that autoFollowPattern1 comes before autoFollowPattern2
    // in the table list that is rendered. As the table orders alphabetically by index name
    // we prefix the random name with "a" and "b" to make sure that autoFollowPattern1 comes before autoFollowPattern2
    const testPrefix = 'prefix_';
    const testSuffix = '_suffix';

    const autoFollowPattern1 = getAutoFollowPatternClientMock({
      name: `a${getRandomString()}`,
      followIndexPattern: `${testPrefix}{{leader_index}}${testSuffix}`
    });
    const autoFollowPattern2 = getAutoFollowPatternClientMock({
      name: `b${getRandomString()}`,
      followIndexPattern: '{{leader_index}}' // no prefix nor suffix
    });
    const autoFollowPatterns = [autoFollowPattern1, autoFollowPattern2];

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadAutoFollowPatternsResponse({ patterns: autoFollowPatterns });

      // Mount the component
      ({
        find,
        exists,
        component,
        table,
        actions,
      } = setup());

      await nextTick(); // Make sure that the Http request is fulfilled
      component.update();

      // Read the index list table
      ({ tableCellsValues, rows } = table.getMetaData('ccrAutoFollowPatternListTable'));
    });

    afterEach(async () => {
      // The <EuiPopover /> updates are not all synchronouse
      // We need to wait for all the updates to ran before unmounting our component
      await nextTick(100);
    });

    test('should not display the empty prompt', () => {
      expect(exists('ccrFollowerIndexEmptyPrompt')).toBe(false);
    });

    test('should have a button to create an auto-follow pattern', () => {
      expect(exists('ccrCreateAutoFollowPatternButton')).toBe(true);
    });

    test('should list the auto-follow patterns in the table', () => {
      expect(tableCellsValues.length).toEqual(autoFollowPatterns.length);
      expect(tableCellsValues).toEqual([
        [ '', // Empty because the first column is the checkbox to select row
          autoFollowPattern1.name,
          autoFollowPattern1.remoteCluster,
          autoFollowPattern1.leaderIndexPatterns.join(', '),
          testPrefix,
          testSuffix,
          '' // Empty because the last column is for the "actions" on the resource
        ], [ '',
          autoFollowPattern2.name,
          autoFollowPattern2.remoteCluster,
          autoFollowPattern2.leaderIndexPatterns.join(', '),
          '', // no prefix
          '', // no suffix
          '' ]
      ]);
    });

    describe('bulk delete button', () => {
      test('should be visible when an auto-follow pattern is selected', () => {
        expect(exists('ccrAutoFollowPatternListBulkDeleteActionButton')).toBe(false);

        actions.selectAutoFollowPatternAt(0);

        expect(exists('ccrAutoFollowPatternListBulkDeleteActionButton')).toBe(true);
      });

      test('should update the button label according to the number of patterns selected', () => {
        actions.selectAutoFollowPatternAt(0); // 1 auto-follow pattern selected
        expect(find('ccrAutoFollowPatternListBulkDeleteActionButton').text()).toEqual('Delete auto-follow pattern');

        actions.selectAutoFollowPatternAt(1); // 2 auto-follow patterns selected
        expect(find('ccrAutoFollowPatternListBulkDeleteActionButton').text()).toEqual('Delete auto-follow patterns');
      });

      test('should open a confirmation modal when clicking the delete button', () => {
        expect(exists('ccrAutoFollowPatternDeleteConfirmationModal')).toBe(false);

        actions.selectAutoFollowPatternAt(0);
        actions.clickBulkDeleteButton();

        expect(exists('ccrAutoFollowPatternDeleteConfirmationModal')).toBe(true);
      });

      test('should remove the auto-follow pattern from the table after delete is complete', async () => {
        // Make sure that we have our 2 auto-follow patterns in the table
        expect(rows.length).toBe(2);

        // We wil delete the *first* auto-follow pattern in the table
        httpRequestsMockHelpers.setDeleteAutoFollowPatternResponse({ itemsDeleted: [autoFollowPattern1.name] });

        actions.selectAutoFollowPatternAt(0);
        actions.clickBulkDeleteButton();
        actions.clickConfirmModalDeleteAutoFollowPattern();

        await nextTick();
        component.update();

        ({ rows } = table.getMetaData('ccrAutoFollowPatternListTable'));

        expect(rows.length).toBe(1);
        expect(rows[0].columns[1].value).toEqual(autoFollowPattern2.name);
      });
    });

    describe('table row actions', () => {
      test('should have a "delete" and an "edit" action button on each row', () => {
        const indexLastColumn = rows[0].columns.length - 1;
        const tableCellActions = rows[0].columns[indexLastColumn].reactWrapper;

        const deleteButton = findTestSubject(tableCellActions, 'ccrAutoFollowPatternListDeleteActionButton');
        const editButton = findTestSubject(tableCellActions, 'ccrAutoFollowPatternListEditActionButton');

        expect(deleteButton.length).toBe(1);
        expect(editButton.length).toBe(1);
      });

      test('should open a confirmation modal when clicking on "delete" button', async () => {
        expect(exists('ccrAutoFollowPatternDeleteConfirmationModal')).toBe(false);

        actions.clickRowActionButtonAt(0, 'delete');

        expect(exists('ccrAutoFollowPatternDeleteConfirmationModal')).toBe(true);
      });
    });

    describe('detail panel', () => {
      test('should open a detail panel when clicking on an auto-follow pattern', () => {
        expect(exists('ccrAutoFollowPatternDetailsFlyout')).toBe(false);

        actions.clickAutoFollowPatternAt(0);

        expect(exists('ccrAutoFollowPatternDetailsFlyout')).toBe(true);
      });

      test('should set the title the auto-follow pattern that has been selected', () => {
        actions.clickAutoFollowPatternAt(0); // Open the detail panel
        expect(find('autoFollowPatternDetailsFlyoutTitle').text()).toEqual(autoFollowPattern1.name);
      });

      test('should have a "settings" section', () => {
        actions.clickAutoFollowPatternAt(0);
        expect(find('ccrAutoFollowPatternDetailPanelSettingsSection').find('h3').text()).toEqual('Settings');
        expect(exists('ccrAutoFollowPatternDetailPanelSettingsValues')).toBe(true);
      });

      test('should set the correct auto-follow pattern settings values', () => {
        actions.clickAutoFollowPatternAt(0);

        expect(find('ccrAutoFollowPatternDetailRemoteCluster').text()).toEqual(autoFollowPattern1.remoteCluster);
        expect(find('ccrAutoFollowPatternDetailLeaderIndexPatterns').text()).toEqual(autoFollowPattern1.leaderIndexPatterns.join(', '));
        expect(find('ccrAutoFollowPatternDetailPatternPrefix').text()).toEqual(testPrefix);
        expect(find('ccrAutoFollowPatternDetailPatternSuffix').text()).toEqual(testSuffix);
      });

      test('should have a default value when there are no prefix or no suffix', () => {
        actions.clickAutoFollowPatternAt(1); // Does not have prefix and suffix

        expect(find('ccrAutoFollowPatternDetailPatternPrefix').text()).toEqual('No prefix');
        expect(find('ccrAutoFollowPatternDetailPatternSuffix').text()).toEqual('No suffix');
      });

      test('should show a preview of the indices that might be generated by the auto-follow pattern', () => {
        actions.clickAutoFollowPatternAt(0);
        const detailPanel = find('ccrAutoFollowPatternDetailsFlyout');
        const indicesPreview = findTestSubject(detailPanel, 'ccrAutoFollowPatternIndexPreview');

        expect(exists('ccrAutoFollowPatternDetailPanelIndicesPreviewSection')).toBe(true);
        expect(indicesPreview.length).toBe(3);
      });

      test('should have a link to view the indices in Index Management', () => {
        actions.clickAutoFollowPatternAt(0);
        expect(exists('ccrAutoFollowPatternDetailsViewIndexManagementButton')).toBe(true);
        expect(find('ccrAutoFollowPatternDetailsViewIndexManagementButton').text()).toBe('View your follower indices in Index Management');
      });

      test('should have a "close", "delete" and "edit" button in the footer', () => {
        actions.clickAutoFollowPatternAt(0);
        expect(exists('ccrAutoFollowPatternDetailsFlyoutCloseButton')).toBe(true);
        expect(exists('ccrAutoFollowPatternDetailsDeleteActionButton')).toBe(true);
        expect(exists('ccrAutoFollowPatternDetailsEditActionButton')).toBe(true);
      });

      test('should close the detail panel when clicking the "close" button', () => {
        actions.clickAutoFollowPatternAt(0); // open the detail panel
        expect(exists('ccrAutoFollowPatternDetailsFlyout')).toBe(true);

        find('ccrAutoFollowPatternDetailsFlyoutCloseButton').simulate('click'); // close the detail panel

        expect(exists('ccrAutoFollowPatternDetailsFlyout')).toBe(false);
      });

      test('should open a confirmation modal when clicking the "delete" button', () => {
        actions.clickAutoFollowPatternAt(0);
        expect(exists('ccrAutoFollowPatternDeleteConfirmationModal')).toBe(false);

        find('ccrAutoFollowPatternDetailsDeleteActionButton').simulate('click');

        expect(exists('ccrAutoFollowPatternDeleteConfirmationModal')).toBe(true);
      });

      test('should display the recent errors', async () => {
        const message = 'bar';
        const recentAutoFollowErrors = [{
          leaderIndex: `${autoFollowPattern1.name}:my-leader-test`,
          autoFollowException: { type: 'exception', reason: message }
        }, {
          leaderIndex: `${autoFollowPattern2.name}:my-leader-test`,
          autoFollowException: { type: 'exception', reason: message }
        }];
        httpRequestsMockHelpers.setAutoFollowStatsResponse({ recentAutoFollowErrors });

        actions.clickAutoFollowPatternAt(0);
        expect(exists('ccrAutoFollowPatternDetailErrors')).toBe(false);

        // We select the other auto-follow pattern because the stats are fetched
        // each time we change the auto-follow pattern selection
        actions.clickAutoFollowPatternAt(1);
        await nextTick();
        component.update();

        expect(exists('ccrAutoFollowPatternDetailErrors')).toBe(true);
        expect(exists('ccrAutoFollowPatternDetailsTitleErrors')).toBe(true);
        expect(find('ccrAutoFollowPatternDetailRecentError').map(error => error.text())).toEqual([message]);
      });
    });
  });
});

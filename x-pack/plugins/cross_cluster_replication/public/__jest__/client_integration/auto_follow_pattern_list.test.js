/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getAutoFollowPatternMock } from './fixtures/auto_follow_pattern';
import './mocks';
import { setupEnvironment, pageHelpers, nextTick, getRandomString } from './helpers';

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
      expect(exists('autoFollowPatternLoading')).toBe(true);
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
      expect(exists('emptyPrompt')).toBe(true);
    });

    test('should have a button to create a follower index', async () => {
      expect(exists('createAutoFollowPatternButton')).toBe(true);
    });
  });

  describe('when there are multiple pages of auto-follow patterns', () => {
    let find;
    let component;
    let table;
    let actions;
    let form;

    const autoFollowPatterns = [
      getAutoFollowPatternMock({ name: 'unique', followPattern: '{{leader_index}}' }),
    ];

    for (let i = 0; i < 29; i++) {
      autoFollowPatterns.push(
        getAutoFollowPatternMock({ name: `${i}`, followPattern: '{{leader_index}}' })
      );
    }

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadAutoFollowPatternsResponse({ patterns: autoFollowPatterns });

      // Mount the component
      ({ find, component, table, actions, form } = setup());

      await nextTick(); // Make sure that the http request is fulfilled
      component.update();
    });

    test('pagination works', () => {
      actions.clickPaginationNextButton();
      const { tableCellsValues } = table.getMetaData('autoFollowPatternListTable');

      // Pagination defaults to 20 auto-follow patterns per page. We loaded 30 auto-follow patterns,
      // so the second page should have 10.
      expect(tableCellsValues.length).toBe(10);
    });

    // Skipped until we can figure out how to get this test to work.
    test.skip('search works', () => {
      form.setInputValue(find('autoFollowPatternSearch'), 'unique');
      const { tableCellsValues } = table.getMetaData('autoFollowPatternListTable');
      expect(tableCellsValues.length).toBe(1);
    });
  });

  describe('when there are auto-follow patterns', () => {
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

    const autoFollowPattern1 = getAutoFollowPatternMock({
      name: `a${getRandomString()}`,
      followIndexPattern: `${testPrefix}{{leader_index}}${testSuffix}`,
    });
    const autoFollowPattern2 = getAutoFollowPatternMock({
      name: `b${getRandomString()}`,
      followIndexPattern: '{{leader_index}}', // no prefix nor suffix
    });
    const autoFollowPatterns = [autoFollowPattern1, autoFollowPattern2];

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadAutoFollowPatternsResponse({ patterns: autoFollowPatterns });

      // Mount the component
      ({ find, exists, component, table, actions } = setup());

      await nextTick(); // Make sure that the Http request is fulfilled
      component.update();

      // Read the index list table
      ({ tableCellsValues, rows } = table.getMetaData('autoFollowPatternListTable'));
    });

    afterEach(async () => {
      // The <EuiPopover /> updates are not all synchronouse
      // We need to wait for all the updates to ran before unmounting our component
      await nextTick(100);
    });

    test('should not display the empty prompt', () => {
      expect(exists('emptyPrompt')).toBe(false);
    });

    test('should have a button to create an auto-follow pattern', () => {
      expect(exists('createAutoFollowPatternButton')).toBe(true);
    });

    test('should list the auto-follow patterns in the table', () => {
      expect(tableCellsValues.length).toEqual(autoFollowPatterns.length);
      expect(tableCellsValues).toEqual([
        [
          '', // Empty because the first column is the checkbox to select row
          autoFollowPattern1.name,
          ' Paused', // Default paused
          autoFollowPattern1.remoteCluster,
          autoFollowPattern1.leaderIndexPatterns.join(', '),
          testPrefix,
          testSuffix,
          '', // Empty because the last column is for the "actions" on the resource
        ],
        [
          '',
          autoFollowPattern2.name,
          ' Paused', // Default paused
          autoFollowPattern2.remoteCluster,
          autoFollowPattern2.leaderIndexPatterns.join(', '),
          '', // no prefix
          '', // no suffix
          '',
        ],
      ]);
    });

    describe('manage patterns context menu button', () => {
      test('should be visible when an auto-follow pattern is selected', () => {
        expect(exists('autoFollowPatternActionMenuButton')).toBe(false);

        actions.selectAutoFollowPatternAt(0);

        expect(exists('autoFollowPatternActionMenuButton')).toBe(true);
      });

      test('should update the button label according to the number of patterns selected', () => {
        actions.selectAutoFollowPatternAt(0); // 1 auto-follow pattern selected
        expect(find('autoFollowPatternActionMenuButton').text()).toEqual('Manage pattern');

        actions.selectAutoFollowPatternAt(1); // 2 auto-follow patterns selected
        expect(find('autoFollowPatternActionMenuButton').text()).toEqual('Manage patterns');
      });

      test('should open a confirmation modal when clicking the delete button', () => {
        expect(exists('deleteAutoFollowPatternConfirmation')).toBe(false);

        actions.selectAutoFollowPatternAt(0);
        actions.clickBulkDeleteButton();

        expect(exists('deleteAutoFollowPatternConfirmation')).toBe(true);
      });

      test('should remove the auto-follow pattern from the table after delete is complete', async () => {
        // Make sure that we have our 2 auto-follow patterns in the table
        expect(rows.length).toBe(2);

        // We wil delete the *first* auto-follow pattern in the table
        httpRequestsMockHelpers.setDeleteAutoFollowPatternResponse({
          itemsDeleted: [autoFollowPattern1.name],
        });

        actions.selectAutoFollowPatternAt(0);
        actions.clickBulkDeleteButton();
        actions.clickConfirmModalDeleteAutoFollowPattern();

        await nextTick();
        component.update();

        ({ rows } = table.getMetaData('autoFollowPatternListTable'));

        expect(rows.length).toBe(1);
        expect(rows[0].columns[1].value).toEqual(autoFollowPattern2.name);
      });
    });

    describe('table row actions', () => {
      test('should have a "pause", "delete" and "edit" action button on each row', () => {
        const indexLastColumn = rows[0].columns.length - 1;
        const tableCellActions = rows[0].columns[indexLastColumn].reactWrapper;
        const contextMenuButton = tableCellActions.find('button');
        contextMenuButton.simulate('click');

        expect(exists('contextMenuDeleteButton')).toBe(true);
        expect(exists('contextMenuEditButton')).toBe(true);
        expect(exists('contextMenuResumeButton')).toBe(true);
      });

      test('should open a confirmation modal when clicking on "delete" button', async () => {
        expect(exists('deleteAutoFollowPatternConfirmation')).toBe(false);

        const indexLastColumn = rows[0].columns.length - 1;
        const tableCellActions = rows[0].columns[indexLastColumn].reactWrapper;
        const contextMenuButton = tableCellActions.find('button');
        contextMenuButton.simulate('click');

        find('contextMenuDeleteButton').simulate('click');

        expect(exists('deleteAutoFollowPatternConfirmation')).toBe(true);
      });
    });

    describe('detail panel', () => {
      test('should open a detail panel when clicking on an auto-follow pattern', () => {
        expect(exists('autoFollowPatternDetail')).toBe(false);

        actions.clickAutoFollowPatternAt(0);

        expect(exists('autoFollowPatternDetail')).toBe(true);
      });

      test('should set the title the auto-follow pattern that has been selected', () => {
        actions.clickAutoFollowPatternAt(0); // Open the detail panel
        expect(find('autoFollowPatternDetail.title').text()).toEqual(autoFollowPattern1.name);
      });

      test('should have a "settings" section', () => {
        actions.clickAutoFollowPatternAt(0);
        expect(find('settingsSection').find('h3').text()).toEqual('Settings');
        expect(exists('settingsValues')).toBe(true);
      });

      test('should set the correct auto-follow pattern settings values', () => {
        actions.clickAutoFollowPatternAt(0);

        expect(find('remoteCluster').text()).toEqual(autoFollowPattern1.remoteCluster);
        expect(find('leaderIndexPatterns').text()).toEqual(
          autoFollowPattern1.leaderIndexPatterns.join(', ')
        );
        expect(find('patternPrefix').text()).toEqual(testPrefix);
        expect(find('patternSuffix').text()).toEqual(testSuffix);
      });

      test('should have a default value when there are no prefix or no suffix', () => {
        actions.clickAutoFollowPatternAt(1); // Does not have prefix and suffix

        expect(find('patternPrefix').text()).toEqual('No prefix');
        expect(find('patternSuffix').text()).toEqual('No suffix');
      });

      test('should show a preview of the indices that might be generated by the auto-follow pattern', () => {
        actions.clickAutoFollowPatternAt(0);

        expect(exists('indicesPreviewSection')).toBe(true);
        expect(exists('indicesPreviewSection.indexPreview', 3)).toBe(true);
      });

      test('should have a link to view the indices in Index Management', () => {
        actions.clickAutoFollowPatternAt(0);
        expect(exists('viewIndexManagementLink')).toBe(true);
        expect(find('viewIndexManagementLink').text()).toBe(
          'View your follower indices in Index Management'
        );
      });

      test('should have a "close", "delete", "edit" and "resume" button in the footer', () => {
        actions.clickAutoFollowPatternAt(0);
        find('autoFollowPatternActionMenuButton').simulate('click');
        expect(exists('autoFollowPatternDetail.closeFlyoutButton')).toBe(true);
        expect(actions.getPatternsActionMenuItemText(0)).toEqual('Resume replication');
        expect(actions.getPatternsActionMenuItemText(1)).toEqual('Edit pattern');
        expect(actions.getPatternsActionMenuItemText(2)).toEqual('Delete pattern');
      });

      test('should close the detail panel when clicking the "close" button', () => {
        actions.clickAutoFollowPatternAt(0); // open the detail panel
        expect(exists('autoFollowPatternDetail')).toBe(true);

        find('closeFlyoutButton').simulate('click'); // close the detail panel

        expect(exists('autoFollowPatternDetail')).toBe(false);
      });

      test('should open a confirmation modal when clicking the "delete" button', () => {
        actions.clickAutoFollowPatternAt(0);
        expect(exists('deleteAutoFollowPatternConfirmation')).toBe(false);

        actions.clickPatternsActionMenuItem(2);

        expect(exists('deleteAutoFollowPatternConfirmation')).toBe(true);
      });

      test('should display the recent errors', async () => {
        const message = 'bar';
        const recentAutoFollowErrors = [
          {
            timestamp: 1587081600021,
            leaderIndex: `${autoFollowPattern1.name}:my-leader-test`,
            autoFollowException: { type: 'exception', reason: message },
          },
          {
            timestamp: 1587081600021,
            leaderIndex: `${autoFollowPattern2.name}:my-leader-test`,
            autoFollowException: { type: 'exception', reason: message },
          },
        ];
        httpRequestsMockHelpers.setAutoFollowStatsResponse({ recentAutoFollowErrors });

        actions.clickAutoFollowPatternAt(0);
        expect(exists('autoFollowPatternDetail.errors')).toBe(false);

        // We select the other auto-follow pattern because the stats are fetched
        // each time we change the auto-follow pattern selection
        actions.clickAutoFollowPatternAt(1);
        await nextTick();
        component.update();

        expect(exists('autoFollowPatternDetail.errors')).toBe(true);
        expect(exists('autoFollowPatternDetail.titleErrors')).toBe(true);
        expect(find('autoFollowPatternDetail.recentError').map((error) => error.text())).toEqual([
          'April 16th, 2020 8:00:00 PM: bar',
        ]);
      });
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';

import { registerTestBed, findTestSubject } from '../../../../test_utils';
import { ccrStore } from '../../public/app/store';
import { setHttpClient } from '../../public/app/services/api';
import routing from '../../public/app/services/routing';

// Mock React router
const reactRouter = {
  history: {
    push: () => {},
    createHref: (location) => location.pathname,
    location: ''
  }
};

routing.reactRouter = reactRouter;
// Mock Angular $q
const $q = { defer: () => ({ resolve() {} }) };
// axios has a $http like interface so using it to simulate $http
setHttpClient(axios.create(), $q);

const initUserActions = ({ getMetadataFromEuiTable, find, form }) => (section) => {
  const userActions = {
    // Follower indices LIST
    followerIndicesList() {
      const { rows } = getMetadataFromEuiTable('ccrFollowerIndexListTable');

      const selectFollowerIndexAt = (index = 0) => {
        const row = rows[index];
        const checkBox = row.reactWrapper.find('input').hostNodes();
        checkBox.simulate('change', { target: { checked: true } });
      };

      const openContextMenu = () => {
        find('ccrFollowerIndexListContextMenuButton').simulate('click');
      };

      const clickContextMenuButtonAt = (index = 0) => {
        const contextMenu = find('followerIndexActionContextMenu');
        contextMenu.find('button').at(index).simulate('click');
      };

      const openTableRowContextMenuAt = (index = 0) => {
        const actionsColumnIndex = rows[0].columns.length - 1; // Actions are in the last column
        const actionsTableCell = rows[index].columns[actionsColumnIndex];
        const button = actionsTableCell.reactWrapper.find('button');
        if (!button.length) {
          throw new Error(`No button to open context menu were found on Follower index list table row ${index}`);
        }
        button.simulate('click');
      };

      const clickFollowerIndexAt = (index = 0) => {
        const followerIndexLink = findTestSubject(rows[index].reactWrapper, 'ccrFollowerIndexListFollowerIndexLink');
        followerIndexLink.simulate('click');
      };

      return {
        selectFollowerIndexAt,
        openContextMenu,
        clickContextMenuButtonAt,
        openTableRowContextMenuAt,
        clickFollowerIndexAt,
      };
    },
    // Auto-follow patterns LIST
    autoFollowPatternList() {
      const { rows } = getMetadataFromEuiTable('ccrAutoFollowPatternListTable');

      const selectAutoFollowPatternAt = (index = 0) => {
        const row = rows[index];
        const checkBox = row.reactWrapper.find('input').hostNodes();
        checkBox.simulate('change', { target: { checked: true } });
      };

      const clickBulkDeleteButton = () => {
        find('ccrAutoFollowPatternListBulkDeleteActionButton').simulate('click');
      };

      const clickConfirmModalDeleteAutoFollowPattern = () => {
        const modal = find('ccrAutoFollowPatternDeleteConfirmationModal');
        findTestSubject(modal, 'confirmModalConfirmButton').simulate('click');
      };

      const clickRowActionButtonAt = (index = 0, action = 'delete') => {
        const indexLastColumn = rows[index].columns.length - 1;
        const tableCellActions = rows[index].columns[indexLastColumn].reactWrapper;

        let button;
        if (action === 'delete') {
          button = findTestSubject(tableCellActions, 'ccrAutoFollowPatternListDeleteActionButton');
        } else if (action === 'edit') {
          findTestSubject(tableCellActions, 'ccrAutoFollowPatternListEditActionButton');
        }

        if (!button) {
          throw new Error(`Button for action "${action}" not found.`);
        }

        button.simulate('click');
      };

      const clickAutoFollowPatternAt = (index = 0) => {
        const autoFollowPatternLink = findTestSubject(rows[index].reactWrapper, 'ccrAutoFollowPatternListPatternLink');
        autoFollowPatternLink.simulate('click');
      };

      return {
        selectAutoFollowPatternAt,
        clickBulkDeleteButton,
        clickConfirmModalDeleteAutoFollowPattern,
        clickRowActionButtonAt,
        clickAutoFollowPatternAt
      };
    },
    // Auto-follow pattern FORM
    autoFollowPatternForm() {
      const clickSaveForm = () => {
        find('ccrAutoFollowPatternFormSubmitButton').simulate('click');
      };

      return {
        clickSaveForm,
      };
    },
    // Follower index FORM
    followerIndexForm() {
      const clickSaveForm = () => {
        find('ccrFollowerIndexFormSubmitButton').simulate('click');
      };

      const toggleAdvancedSettings = () => {
        form.selectCheckBox('ccrFollowerIndexFormCustomAdvancedSettingsToggle');
      };

      return {
        clickSaveForm,
        toggleAdvancedSettings,
      };
    }
  };

  return userActions[section]();
};

export { nextTick, getRandomString, findTestSubject } from '../../../../test_utils';

export const initTestBed = (component, props = {}, options) => {
  const testBed = registerTestBed(component, {}, ccrStore)(props, options);
  const getUserActions = initUserActions(testBed);

  // Cutsom Form helpers
  const setIndexPatternValue = (value) => {
    const comboBox = testBed.find('ccrAutoFollowPatternFormIndexPatternInput');
    const indexPatternsInput = findTestSubject(comboBox, 'comboBoxSearchInput');
    testBed.form.setInputValue(indexPatternsInput, value);

    // We need to press the ENTER key in order for the EuiComboBox to register
    // the value. (keyCode 13 === ENTER)
    comboBox.simulate('keydown', { keyCode: 13 });
    testBed.component.update();
  };

  return {
    ...testBed,
    getUserActions,
    form: {
      ...testBed.form,
      setIndexPatternValue,
    }
  };
};

export const registerHttpRequestMockHelpers = server => {
  const mockResponse = (defaultResponse, response) => ([
    200,
    { 'Content-Type': 'application/json' },
    JSON.stringify({ ...defaultResponse, ...response }),
  ]);

  const setLoadFollowerIndicesResponse = (response) => {
    const defaultResponse = { indices: [] };

    server.respondWith('GET', 'api/cross_cluster_replication/follower_indices',
      mockResponse(defaultResponse, response));
  };

  const setLoadAutoFollowPatternsResponse = (response) => {
    const defaultResponse = { patterns: [] };

    server.respondWith('GET', 'api/cross_cluster_replication/auto_follow_patterns',
      mockResponse(defaultResponse, response)
    );
  };

  const setDeleteAutoFollowPatternResponse = (response) => {
    const defaultResponse = { errors: [], itemsDeleted: [] };

    server.respondWith('DELETE', /api\/cross_cluster_replication\/auto_follow_patterns/,
      mockResponse(defaultResponse, response)
    );
  };

  const setAutoFollowStatsResponse = (response) => {
    const defaultResponse = {
      numberOfFailedFollowIndices: 0,
      numberOfFailedRemoteClusterStateRequests: 0,
      numberOfSuccessfulFollowIndices: 0,
      recentAutoFollowErrors: [],
      autoFollowedClusters: [{
        clusterName: 'new-york',
        timeSinceLastCheckMillis: 13746,
        lastSeenMetadataVersion: 22
      }]
    };

    server.respondWith('GET', 'api/cross_cluster_replication/stats/auto_follow',
      mockResponse(defaultResponse, response)
    );
  };

  const setLoadRemoteClustersResponse = (response = [], error) => {
    if (error) {
      server.respondWith('GET', '/api/remote_clusters',
        [error.status || 400, { 'Content-Type': 'application/json' }, JSON.stringify(error.body)]
      );
    } else {
      server.respondWith('GET', '/api/remote_clusters',
        [200, { 'Content-Type': 'application/json' }, JSON.stringify(response)]
      );
    }
  };

  const setGetAutoFollowPatternResponse = (response) => {
    const defaultResponse = {};

    server.respondWith('GET', /api\/cross_cluster_replication\/auto_follow_patterns\/.+/,
      mockResponse(defaultResponse, response)
    );
  };

  const setGetClusterIndicesResponse = (response = []) => {
    server.respondWith('GET', '/api/index_management/indices',
      [200, { 'Content-Type': 'application/json' }, JSON.stringify(response)]);
  };

  const setGetFollowerIndexResponse = (response) => {
    const defaultResponse = {};

    server.respondWith('GET', /api\/cross_cluster_replication\/follower_indices\/.+/,
      mockResponse(defaultResponse, response)
    );
  };

  return {
    setLoadFollowerIndicesResponse,
    setLoadAutoFollowPatternsResponse,
    setDeleteAutoFollowPatternResponse,
    setAutoFollowStatsResponse,
    setLoadRemoteClustersResponse,
    setGetAutoFollowPatternResponse,
    setGetClusterIndicesResponse,
    setGetFollowerIndexResponse,
  };
};

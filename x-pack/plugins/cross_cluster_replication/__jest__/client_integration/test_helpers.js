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
    createHref: (location) => location.pathname,
    location: ''
  }
};

routing.reactRouter = reactRouter;
// Mock Angular $q
const $q = { defer: () => ({ resolve() {} }) };
// axios has a $http like interface so using it to simulate $http
setHttpClient(axios.create(), $q);

const initUserActions = ({ getMetadataFromEuiTable, find }) => (section) => {

  // USER ACTIONS for the Follower indices list page
  const followerIndicesListActions = () => {
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
  };

  // ----------

  switch(section) {
    case 'followerIndicesList':
      return followerIndicesListActions();
    default:
      return {};
  }
};

export { nextTick, getRandomString } from '../../../../test_utils';

export const initTestBed = (component, props = {}) => {
  const testBed = registerTestBed(component, {}, ccrStore)(props);
  const getUserActions = initUserActions(testBed);

  return {
    ...testBed,
    getUserActions,
  };
};

export const mockServerResponses = server => {
  const mockLoadFollowerIndices = (response) => {
    const defaultResponse = {
      indices: [],
    };
    server.respondWith(/api\/cross_cluster_replication\/follower_indices/, [
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify({ ...defaultResponse, ...response }),
    ]);
  };

  mockLoadFollowerIndices();

  return { mockLoadFollowerIndices };
};

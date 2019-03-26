/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';

import { registerTestBed, /* findTestSubject */ } from '../../../../test_utils';
import { remoteClustersStore } from '../../public/store';
import { setHttpClient } from '../../public/services/api';
import { registerRouter } from '../../public/services';

// axios has a $http like interface so using it to simulate $http
setHttpClient(axios.create());

// Mock React router
const reactRouter = {
  history: {
    push: () => {},
    createHref: (location) => location.pathname,
    location: ''
  }
};

registerRouter(reactRouter);

const initUserActions = ({ /* getMetadataFromEuiTable, find */ }) => (section) => {
  const userActions = {
    // Follower indices user actions
    listRemoteClusters() {
      // const { rows } = getMetadataFromEuiTable('ccrFollowerIndexListTable');

      // const selectFollowerIndexAt = (index = 0) => {
      //   const row = rows[index];
      //   const checkBox = row.reactWrapper.find('input').hostNodes();
      //   checkBox.simulate('change', { target: { checked: true } });
      // };

      // const openContextMenu = () => {
      //   find('ccrFollowerIndexListContextMenuButton').simulate('click');
      // };

      // const clickContextMenuButtonAt = (index = 0) => {
      //   const contextMenu = find('followerIndexActionContextMenu');
      //   contextMenu.find('button').at(index).simulate('click');
      // };

      // const openTableRowContextMenuAt = (index = 0) => {
      //   const actionsColumnIndex = rows[0].columns.length - 1; // Actions are in the last column
      //   const actionsTableCell = rows[index].columns[actionsColumnIndex];
      //   const button = actionsTableCell.reactWrapper.find('button');
      //   if (!button.length) {
      //     throw new Error(`No button to open context menu were found on Follower index list table row ${index}`);
      //   }
      //   button.simulate('click');
      // };

      // const clickFollowerIndexAt = (index = 0) => {
      //   const followerIndexLink = findTestSubject(rows[index].reactWrapper, 'ccrFollowerIndexListFollowerIndexLink');
      //   followerIndexLink.simulate('click');
      // };

      return {
        // selectFollowerIndexAt,
        // openContextMenu,
        // clickContextMenuButtonAt,
        // openTableRowContextMenuAt,
        // clickFollowerIndexAt,
      };
    },
  };

  return userActions[section]();
};

// export { nextTick, getRandomString, findTestSubject } from '../../../../test_utils';

export const initTestBed = (component, props = {}, options) => {
  const testBed = registerTestBed(component, {}, remoteClustersStore)(props, options);
  const getUserActions = initUserActions(testBed);

  return {
    ...testBed,
    getUserActions,
  };
};

export const mockAllHttpRequests = server => {
  const mockResponse = (defaultResponse, response) => ([
    200,
    { 'Content-Type': 'application/json' },
    JSON.stringify({ ...defaultResponse, ...response }),
  ]);

  const setLoadRemoteClustersResponse = (response) => {
    const defaultResponse = [];

    server.respondWith('GET', 'api/remote_clusters',
      mockResponse(defaultResponse, response));
  };

  // const setLoadAutoFollowPatternsResponse = (response) => {
  //   const defaultResponse = { patterns: [] };

  //   server.respondWith('GET', 'api/cross_cluster_replication/auto_follow_patterns',
  //     mockResponse(defaultResponse, response)
  //   );
  // };

  // const setDeleteAutoFollowPatternResponse = (response) => {
  //   const defaultResponse = { errors: [], itemsDeleted: [] };

  //   server.respondWith('DELETE', /api\/cross_cluster_replication\/auto_follow_patterns/,
  //     mockResponse(defaultResponse, response)
  //   );
  // };

  // const setAutoFollowStatsResponse = (response) => {
  //   const defaultResponse = {
  //     numberOfFailedFollowIndices: 0,
  //     numberOfFailedRemoteClusterStateRequests: 0,
  //     numberOfSuccessfulFollowIndices: 0,
  //     recentAutoFollowErrors: [],
  //     autoFollowedClusters: [{
  //       clusterName: 'new-york',
  //       timeSinceLastCheckMillis: 13746,
  //       lastSeenMetadataVersion: 22
  //     }]
  //   };

  //   server.respondWith('GET', 'api/cross_cluster_replication/stats/auto_follow',
  //     mockResponse(defaultResponse, response)
  //   );
  // };

  /**
   * Set all http request to their default response
   */
  setLoadRemoteClustersResponse();
  // setLoadAutoFollowPatternsResponse();
  // setAutoFollowStatsResponse();

  /**
   * Return a method to override any of the http reques
   */
  return (requestId, response) => {
    const mapRequestToHelper = {
      'loadRemoteClusters': setLoadRemoteClustersResponse,
    };

    if (!mapRequestToHelper[requestId]) {
      throw new Error(`Did not find a helper to set http response for request ${requestId}`);
    }

    return mapRequestToHelper[requestId](response);
  };
};

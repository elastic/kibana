/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';

import { registerTestBed, findTestSubject } from '../../../../test_utils';
import { createRemoteClustersStore } from '../../public/store';
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

const initUserActions = ({ getMetadataFromEuiTable, find }) => (section) => {
  const userActions = {
    // Remote cluster list user actions
    remoteClusterList() {
      const { rows } = getMetadataFromEuiTable('remoteClusterListTable');

      const selectRemoteClusterAt = (index = 0) => {
        const row = rows[index];
        const checkBox = row.reactWrapper.find('input').hostNodes();
        checkBox.simulate('change', { target: { checked: true } });
      };

      const clickBulkDeleteButton = () => {
        find('remoteClusterBulkDeleteButton').simulate('click');
      };

      const clickRowActionButtonAt = (index = 0, action = 'delete') => {
        const indexLastColumn = rows[index].columns.length - 1;
        const tableCellActions = rows[index].columns[indexLastColumn].reactWrapper;

        let button;
        if (action === 'delete') {
          button = findTestSubject(tableCellActions, 'remoteClusterTableRowRemoveButton');
        } else if (action === 'edit') {
          findTestSubject(tableCellActions, 'remoteClusterTableRowEditButton');
        }

        if (!button) {
          throw new Error(`Button for action "${action}" not found.`);
        }

        button.simulate('click');
      };

      const clickConfirmModalDeleteRemoteCluster = () => {
        const modal = find('remoteClustersDeleteConfirmModal');
        findTestSubject(modal, 'confirmModalConfirmButton').simulate('click');
      };

      const clickRemoteClusterAt = (index = 0) => {
        const remoteClusterLink = findTestSubject(rows[index].reactWrapper, 'remoteClustersTableListClusterLink');
        remoteClusterLink.simulate('click');
      };

      return {
        selectRemoteClusterAt,
        clickBulkDeleteButton,
        clickRowActionButtonAt,
        clickConfirmModalDeleteRemoteCluster,
        clickRemoteClusterAt,
      };
    },
    // Remote cluster Add
    remoteClusterAdd() {
      const clickSaveForm = () => {
        find('remoteClusterFormSaveButton').simulate('click');
      };

      return {
        clickSaveForm,
      };
    }
  };

  return userActions[section]();
};

export { nextTick, getRandomString, findTestSubject } from '../../../../test_utils';

export const initTestBed = (component, props = {}, options) => {
  const testBed = registerTestBed(component, {}, createRemoteClustersStore())(props, options);
  const getUserActions = initUserActions(testBed);

  return {
    ...testBed,
    getUserActions,
  };
};

export const registerHttpRequestMockHelpers = server => {
  const mockResponse = (defaultResponse, response) => ([
    200,
    { 'Content-Type': 'application/json' },
    JSON.stringify({ ...defaultResponse, ...response }),
  ]);

  const setLoadRemoteClustersResponse = (response) => {
    const defaultResponse = [];

    server.respondWith('GET', '/api/remote_clusters', [
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify(response ? response : defaultResponse),
    ]);
  };

  const setDeleteRemoteClusterResponse = (response) => {
    const defaultResponse = {
      itemsDeleted: [],
      errors: [],
    };

    server.respondWith('DELETE', /api\/remote_clusters/,
      mockResponse(defaultResponse, response)
    );
  };

  return {
    setLoadRemoteClustersResponse,
    setDeleteRemoteClusterResponse,
  };
};

export const NON_ALPHA_NUMERIC_CHARS = [
  '#', '@', '.', '$', '*', '(', ')', '+', ';', '~', ':', '\'', '/', '%', '?', ',', '=', '&', '!', '-', '_'
];

export const ACCENTED_CHARS = ['À', 'à', 'Á', 'á', 'Â', 'â', 'Ã', 'ã', 'Ä', 'ä', 'Ç', 'ç', 'È', 'è', 'É', 'é', 'Ê', 'ê', 'Ë', 'ë', 'Ì',
  'ì', 'Í', 'í', 'Î', 'î', 'Ï', 'ï', 'Ñ', 'ñ', 'Ò', 'ò', 'Ó', 'ó', 'Ô', 'ô', 'Õ', 'õ', 'Ö', 'ö', 'Š', 'š', 'Ú', 'ù', 'Û', 'ú',
  'Ü', 'û', 'Ù', 'ü', 'Ý', 'ý', 'Ÿ', 'ÿ', 'Ž', 'ž'];

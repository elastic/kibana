/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed, findTestSubject } from '../../../../../test_utils';
import { RemoteClusterList } from '../../../public/sections/remote_cluster_list';
import { createRemoteClustersStore } from '../../../public/store';
import { registerRouter } from '../../../public/services/routing';

const testBedConfig = {
  store: createRemoteClustersStore,
  memoryRouter: {
    onRouter: (router) => registerRouter(router)
  }
};

const initTestBed = registerTestBed(RemoteClusterList, testBedConfig);

export const setup = (props) => {
  const testBed = initTestBed(props);
  const EUI_TABLE = 'remoteClusterListTable';

  // User actions
  const selectRemoteClusterAt = (index = 0) => {
    const { rows } = testBed.table.getMetaData(EUI_TABLE);
    const row = rows[index];
    const checkBox = row.reactWrapper.find('input').hostNodes();
    checkBox.simulate('change', { target: { checked: true } });
  };

  const clickBulkDeleteButton = () => {
    testBed.find('remoteClusterBulkDeleteButton').simulate('click');
  };

  const clickRowActionButtonAt = (index = 0, action = 'delete') => {
    const { rows } = testBed.table.getMetaData(EUI_TABLE);
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
    const modal = testBed.find('remoteClustersDeleteConfirmModal');
    findTestSubject(modal, 'confirmModalConfirmButton').simulate('click');
  };

  const clickRemoteClusterAt = (index = 0) => {
    const { rows } = testBed.table.getMetaData(EUI_TABLE);
    const remoteClusterLink = findTestSubject(rows[index].reactWrapper, 'remoteClustersTableListClusterLink');
    remoteClusterLink.simulate('click');
  };

  return {
    ...testBed,
    actions: {
      selectRemoteClusterAt,
      clickBulkDeleteButton,
      clickRowActionButtonAt,
      clickConfirmModalDeleteRemoteCluster,
      clickRemoteClusterAt,
    }
  };
};

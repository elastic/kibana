/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { registerTestBed, findTestSubject } from '@kbn/test-jest-helpers';

import { WithAppDependencies } from '../helpers';
import { RemoteClusterList } from '../../../public/application/sections/remote_cluster_list';
import { createRemoteClustersStore } from '../../../public/application/store';
import { registerRouter } from '../../../public/application/services/routing';

const testBedConfig = {
  store: createRemoteClustersStore,
  memoryRouter: {
    onRouter: (router) => registerRouter(router),
  },
};

export const setup = async (httpSetup, overrides) => {
  const initTestBed = registerTestBed(
    // ESlint cannot figure out that the hoc should start with a capital leter.
    // eslint-disable-next-line
    WithAppDependencies(RemoteClusterList, httpSetup, overrides),
    testBedConfig
  );
  const testBed = await initTestBed();

  const EUI_TABLE = 'remoteClusterListTable';

  // User actions
  const selectRemoteClusterAt = (index = 0) => {
    const { rows } = testBed.table.getMetaData(EUI_TABLE);
    const row = rows[index];
    const checkBox = row.reactWrapper.find('input').hostNodes();

    act(() => {
      checkBox.simulate('change', { target: { checked: true } });
    });

    testBed.component.update();
  };

  const clickBulkDeleteButton = () => {
    const { find, component } = testBed;
    act(() => {
      find('remoteClusterBulkDeleteButton').simulate('click');
    });

    component.update();
  };

  const clickRowActionButtonAt = (index = 0, action = 'delete') => {
    const { table, component } = testBed;
    const { rows } = table.getMetaData(EUI_TABLE);
    const indexLastColumn = rows[index].columns.length - 1;
    const tableCellActions = rows[index].columns[indexLastColumn].reactWrapper;

    let button;
    if (action === 'delete') {
      button = findTestSubject(tableCellActions, 'remoteClusterTableRowRemoveButton');
    } else if (action === 'edit') {
      button = findTestSubject(tableCellActions, 'remoteClusterTableRowEditButton');
    }

    if (!button) {
      throw new Error(`Button for action "${action}" not found.`);
    }

    act(() => {
      button.simulate('click');
    });

    component.update();
  };

  const clickConfirmModalDeleteRemoteCluster = () => {
    const { find, component } = testBed;
    const modal = find('remoteClustersDeleteConfirmModal');

    act(() => {
      findTestSubject(modal, 'confirmModalConfirmButton').simulate('click');
    });

    component.update();
  };

  const clickRemoteClusterAt = (index = 0) => {
    const { table, component } = testBed;
    const { rows } = table.getMetaData(EUI_TABLE);
    const remoteClusterLink = findTestSubject(
      rows[index].reactWrapper,
      'remoteClustersTableListClusterLink'
    );

    act(() => {
      remoteClusterLink.simulate('click');
    });

    component.update();
  };

  const clickPaginationNextButton = () => {
    const { find, component } = testBed;

    act(() => {
      find('remoteClusterListTable.pagination-button-next').simulate('click');
    });

    component.update();
  };

  return {
    ...testBed,
    actions: {
      selectRemoteClusterAt,
      clickBulkDeleteButton,
      clickRowActionButtonAt,
      clickConfirmModalDeleteRemoteCluster,
      clickRemoteClusterAt,
      clickPaginationNextButton,
    },
  };
};

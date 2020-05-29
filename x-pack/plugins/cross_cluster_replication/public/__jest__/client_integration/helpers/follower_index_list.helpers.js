/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed, findTestSubject } from '../../../../../../test_utils';
import { FollowerIndicesList } from '../../../app/sections/home/follower_indices_list';
import { ccrStore } from '../../../app/store';
import { routing } from '../../../app/services/routing';

const testBedConfig = {
  store: ccrStore,
  memoryRouter: {
    onRouter: (router) =>
      (routing.reactRouter = {
        history: {
          ...router.history,
          parentHistory: {
            createHref: () => '',
            push: () => {},
          },
        },
        getUrlForApp: () => '',
      }),
  },
};

const initTestBed = registerTestBed(FollowerIndicesList, testBedConfig);

export const setup = (props) => {
  const testBed = initTestBed(props);
  const EUI_TABLE = 'followerIndexListTable';

  /**
   * User Actions
   */

  const selectFollowerIndexAt = (index = 0) => {
    const { rows } = testBed.table.getMetaData(EUI_TABLE);
    const row = rows[index];
    const checkBox = row.reactWrapper.find('input').hostNodes();
    checkBox.simulate('change', { target: { checked: true } });
  };

  const openContextMenu = () => {
    testBed.find('contextMenuButton').simulate('click');
  };

  const clickContextMenuButtonAt = (index = 0) => {
    const contextMenu = testBed.find('contextMenu');
    contextMenu.find('button').at(index).simulate('click');
  };

  const openTableRowContextMenuAt = (index = 0) => {
    const { rows } = testBed.table.getMetaData(EUI_TABLE);
    const actionsColumnIndex = rows[0].columns.length - 1; // Actions are in the last column
    const actionsTableCell = rows[index].columns[actionsColumnIndex];
    const button = actionsTableCell.reactWrapper.find('button');
    if (!button.length) {
      throw new Error(
        `No button to open context menu were found on Follower index list table row ${index}`
      );
    }
    button.simulate('click');
  };

  const clickFollowerIndexAt = (index = 0) => {
    const { rows } = testBed.table.getMetaData(EUI_TABLE);
    const followerIndexLink = findTestSubject(rows[index].reactWrapper, 'followerIndexLink');
    followerIndexLink.simulate('click');
  };

  const clickPaginationNextButton = () => {
    testBed.find('followerIndexListTable.pagination-button-next').simulate('click');
  };

  return {
    ...testBed,
    actions: {
      selectFollowerIndexAt,
      openContextMenu,
      clickContextMenuButtonAt,
      openTableRowContextMenuAt,
      clickFollowerIndexAt,
      clickPaginationNextButton,
    },
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { act } from 'react-dom/test-utils';

import { registerTestBed, findTestSubject } from '@kbn/test-jest-helpers';
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

  const selectFollowerIndexAt = async (index = 0) => {
    const { table, component } = testBed;
    const { rows } = table.getMetaData(EUI_TABLE);
    const row = rows[index];
    const checkBox = row.reactWrapper.find('input').hostNodes();

    await act(async () => {
      checkBox.simulate('change', { target: { checked: true } });
    });

    component.update();
  };

  const openContextMenu = async () => {
    const { find, component } = testBed;

    await act(async () => {
      find('contextMenuButton').simulate('click');
    });

    component.update();
  };

  const clickContextMenuButtonAt = async (index = 0) => {
    const { find, component } = testBed;

    const contextMenu = find('contextMenu');

    await act(async () => {
      contextMenu.find('button').at(index).simulate('click');
    });

    component.update();
  };

  const openTableRowContextMenuAt = async (index = 0) => {
    const { table, component } = testBed;
    const { rows } = table.getMetaData(EUI_TABLE);
    const actionsColumnIndex = rows[0].columns.length - 1; // Actions are in the last column
    const actionsTableCell = rows[index].columns[actionsColumnIndex];
    const button = actionsTableCell.reactWrapper.find('button');
    if (!button.length) {
      throw new Error(
        `No button to open context menu were found on Follower index list table row ${index}`
      );
    }

    await act(async () => {
      button.simulate('click');
    });

    component.update();
  };

  const clickFollowerIndexAt = async (index = 0) => {
    const { table, component } = testBed;
    const { rows } = table.getMetaData(EUI_TABLE);
    const followerIndexLink = findTestSubject(rows[index].reactWrapper, 'followerIndexLink');

    await act(async () => {
      followerIndexLink.simulate('click');
    });

    component.update();
  };

  const clickPaginationNextButton = async () => {
    const { find, component } = testBed;

    await act(async () => {
      find('followerIndexListTable.pagination-button-next').simulate('click');
    });

    component.update();
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

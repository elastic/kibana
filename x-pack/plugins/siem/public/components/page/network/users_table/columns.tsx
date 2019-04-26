/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { StaticIndexPattern } from 'ui/index_patterns';

import { FlowTarget, UsersItem } from '../../../../graphql/types';
import { networkModel } from '../../../../store';
import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../drag_and_drop/helpers';
import { getEmptyTagValue } from '../../../empty_value';
import { Columns } from '../../../load_more_table';
import { Provider } from '../../../timeline/data_providers/provider';

import * as i18n from './translations';
import { getRowItemDraggables } from '../../../tables/helpers';

export const getUsersColumns = (
  indexPattern: StaticIndexPattern,
  ip: string,
  flowTarget: FlowTarget,
  type: networkModel.NetworkType,
  tableId: string
): [
  Columns<UsersItem['name']>,
  Columns<UsersItem['id']>,
  Columns<UsersItem['groupName']>,
  Columns<UsersItem['groupId']>,
  Columns<UsersItem['count']>
] => [
  {
    field: `node.user.name`,
    name: i18n.USER_NAME,
    truncateText: false,
    hideForMobile: false,
    sortable: true,
    render: userName => {
      const userNameAttr = 'user.name';
      if (userName != null) {
        const id = escapeDataProviderId(`${tableId}-table-${flowTarget}-user-${userName}`);
        return (
          <DraggableWrapper
            key={id}
            dataProvider={{
              and: [],
              enabled: true,
              id,
              name: userName,
              excluded: false,
              kqlQuery: '',
              queryMatch: { field: userNameAttr, value: userName },
            }}
            render={(dataProvider, _, snapshot) =>
              snapshot.isDragging ? (
                <DragEffects>
                  <Provider dataProvider={dataProvider} />
                </DragEffects>
              ) : (
                <>{userName}</>
              )
            }
          />
        );
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    field: 'node.user.id',
    name: i18n.USER_ID,
    truncateText: false,
    hideForMobile: false,
    sortable: false,
    render: userIds => {
      if (userIds != null && userIds.length > 0) {
        return getRowItemDraggables(userIds, 'user.id', `${tableId}-table-${flowTarget}`);
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    field: 'node.user.groupName',
    name: i18n.GROUP_NAME,
    truncateText: false,
    hideForMobile: false,
    sortable: false,
    render: groupNames => {
      if (groupNames != null && groupNames.length > 0) {
        return getRowItemDraggables(
          groupNames,
          'user.group.name',
          `${tableId}-table-${flowTarget}`
        );
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    field: 'node.user.groupId',
    name: i18n.GROUP_ID,
    truncateText: false,
    hideForMobile: false,
    sortable: false,
    render: groupId => {
      if (groupId != null && groupId.length > 0) {
        return getRowItemDraggables(groupId, 'user.group.id', `${tableId}-table-${flowTarget}`);
      } else {
        return getEmptyTagValue();
      }
    },
  },

  {
    field: 'node.user.count',
    name: i18n.DOCUMENT_COUNT,
    truncateText: false,
    hideForMobile: false,
    sortable: true,
    render: docCount => {
      if (docCount != null) {
        return <>{docCount}</>;
      } else {
        return getEmptyTagValue();
      }
    },
  },
];

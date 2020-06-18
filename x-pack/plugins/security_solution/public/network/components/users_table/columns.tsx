/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FlowTarget, UsersItem } from '../../../graphql/types';
import { defaultToEmptyTag } from '../../../common/components/empty_value';
import { Columns } from '../../../common/components/paginated_table';

import * as i18n from './translations';
import {
  getRowItemDraggables,
  getRowItemDraggable,
} from '../../../common/components/tables/helpers';

export type UsersColumns = [
  Columns<UsersItem['name']>,
  Columns<UsersItem['id']>,
  Columns<UsersItem['groupName']>,
  Columns<UsersItem['groupId']>,
  Columns<UsersItem['count']>
];

export const getUsersColumns = (flowTarget: FlowTarget, tableId: string): UsersColumns => [
  {
    field: 'node.user.name',
    name: i18n.USER_NAME,
    truncateText: false,
    hideForMobile: false,
    sortable: true,
    render: (userName) =>
      getRowItemDraggable({
        rowItem: userName,
        attrName: 'user.name',
        idPrefix: `${tableId}-table-${flowTarget}-user`,
      }),
  },
  {
    field: 'node.user.id',
    name: i18n.USER_ID,
    truncateText: false,
    hideForMobile: false,
    sortable: false,
    render: (userIds) =>
      getRowItemDraggables({
        rowItems: userIds,
        attrName: 'user.id',
        idPrefix: `${tableId}-table-${flowTarget}`,
      }),
  },
  {
    field: 'node.user.groupName',
    name: i18n.GROUP_NAME,
    truncateText: false,
    hideForMobile: false,
    sortable: false,
    render: (groupNames) =>
      getRowItemDraggables({
        rowItems: groupNames,
        attrName: 'user.group.name',
        idPrefix: `${tableId}-table-${flowTarget}`,
      }),
  },
  {
    field: 'node.user.groupId',
    name: i18n.GROUP_ID,
    truncateText: false,
    hideForMobile: false,
    sortable: false,
    render: (groupId) =>
      getRowItemDraggables({
        rowItems: groupId,
        attrName: 'user.group.id',
        idPrefix: `${tableId}-table-${flowTarget}`,
      }),
  },
  {
    align: 'right',
    field: 'node.user.count',
    name: i18n.DOCUMENT_COUNT,
    truncateText: false,
    hideForMobile: false,
    sortable: true,
    render: (docCount) => defaultToEmptyTag(docCount),
  },
];

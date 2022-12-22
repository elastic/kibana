/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlowTargetSourceDest, NetworkUsersItem } from '../../../../../common/search_strategy';
import { defaultToEmptyTag } from '../../../../common/components/empty_value';
import type { Columns } from '../../../components/paginated_table';

import * as i18n from './translations';
import { getRowItemsWithActions } from '../../../../common/components/tables/helpers';

export type UsersColumns = [
  Columns<NetworkUsersItem['name']>,
  Columns<NetworkUsersItem['id']>,
  Columns<NetworkUsersItem['groupName']>,
  Columns<NetworkUsersItem['groupId']>,
  Columns<NetworkUsersItem['count']>
];

export const getUsersColumns = (
  flowTarget: FlowTargetSourceDest,
  tableId: string
): UsersColumns => [
  {
    field: 'node.user.name',
    name: i18n.USER_NAME,
    truncateText: false,
    mobileOptions: { show: true },
    sortable: true,
    render: (userName) =>
      getRowItemsWithActions({
        values: userName ? [userName] : undefined,
        fieldName: 'user.name',
        fieldType: 'keyword',
        idPrefix: `${tableId}-table-${flowTarget}-user`,
      }),
  },
  {
    field: 'node.user.id',
    name: i18n.USER_ID,
    truncateText: false,
    mobileOptions: { show: true },
    sortable: false,
    render: (userIds) =>
      getRowItemsWithActions({
        values: userIds,
        fieldName: 'user.id',
        fieldType: 'keyword',
        idPrefix: `${tableId}-table-${flowTarget}`,
      }),
  },
  {
    field: 'node.user.groupName',
    name: i18n.GROUP_NAME,
    truncateText: false,
    mobileOptions: { show: true },
    sortable: false,
    render: (groupNames) =>
      getRowItemsWithActions({
        values: groupNames,
        fieldName: 'user.group.name',
        fieldType: 'keyword',
        idPrefix: `${tableId}-table-${flowTarget}`,
      }),
  },
  {
    field: 'node.user.groupId',
    name: i18n.GROUP_ID,
    truncateText: false,
    mobileOptions: { show: true },
    sortable: false,
    render: (groupId) =>
      getRowItemsWithActions({
        values: groupId,
        fieldName: 'user.group.id',
        fieldType: 'keyword',
        idPrefix: `${tableId}-table-${flowTarget}`,
      }),
  },
  {
    align: 'right',
    field: 'node.user.count',
    name: i18n.DOCUMENT_COUNT,
    truncateText: false,
    mobileOptions: { show: true },
    sortable: true,
    render: (docCount) => defaultToEmptyTag(docCount),
  },
];

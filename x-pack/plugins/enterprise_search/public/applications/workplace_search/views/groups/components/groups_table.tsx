/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiSpacer,
  EuiTable,
  EuiTableBody,
  EuiTableHeader,
  EuiTableHeaderCell,
} from '@elastic/eui';

import { TablePaginationBar } from '../../../components/shared/table_pagination_bar';

import { AppLogic } from '../../../app_logic';
import { GroupsLogic } from '../groups_logic';
import { GroupRow } from './group_row';

import { ClearFiltersLink } from './clear_filters_link';

export const GroupsTable: React.FC<{}> = () => {
  const { setActivePage } = useActions(GroupsLogic);
  const {
    groupsMeta: {
      page: { total_pages: totalPages, total_results: totalItems, current: activePage },
    },
    groups,
    hasFiltersSet,
  } = useValues(GroupsLogic);
  const { isFederatedAuth } = useValues(AppLogic);

  const clearFiltersLink = hasFiltersSet ? <ClearFiltersLink /> : undefined;

  const paginationOptions = {
    itemLabel: 'Groups',
    totalPages,
    totalItems,
    activePage,
    clearFiltersLink,
    onChangePage: (page: number) => {
      // EUI component starts page at 0. API starts at 1.
      setActivePage(page + 1);
    },
  };

  const showPagination = totalPages > 1;

  return (
    <>
      {showPagination ? <TablePaginationBar {...paginationOptions} /> : clearFiltersLink}
      <EuiSpacer size="m" />
      <EuiTable>
        <EuiTableHeader>
          <EuiTableHeaderCell>Group</EuiTableHeaderCell>
          <EuiTableHeaderCell>Content sources</EuiTableHeaderCell>
          {!isFederatedAuth && <EuiTableHeaderCell>Users</EuiTableHeaderCell>}
          <EuiTableHeaderCell />
        </EuiTableHeader>
        <EuiTableBody>
          {groups.map((group, index) => (
            <GroupRow key={index} {...group} />
          ))}
        </EuiTableBody>
      </EuiTable>
      <EuiSpacer size="m" />
      {showPagination && <TablePaginationBar {...paginationOptions} hideLabelCount={true} />}
    </>
  );
};

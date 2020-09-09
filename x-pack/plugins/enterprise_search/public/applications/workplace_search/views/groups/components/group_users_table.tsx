/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';

import { useValues } from 'kea';

import { EuiTable, EuiTableBody, EuiTablePagination } from '@elastic/eui';
import { Pager } from '@elastic/eui';

import { IUser } from '../../../types';

import { TableHeader } from '../../../../shared/table_header';
import { UserRow } from '../../../components/shared/user_row';

import { AppLogic } from '../../../app_logic';
import { GroupLogic } from '../group_logic';

const USERS_PER_PAGE = 10;

export const GroupUsersTable: React.FC = () => {
  const { isFederatedAuth } = useValues(AppLogic);
  const {
    group: { users },
  } = useValues(GroupLogic);
  const headerItems = ['Username'];
  if (!isFederatedAuth) {
    headerItems.push('Email');
  }

  const [firstItem, setFirstItem] = useState(0);
  const [lastItem, setLastItem] = useState(USERS_PER_PAGE - 1);
  const [currentPage, setCurrentPage] = useState(0);

  const numUsers = users.length;
  const pager = new Pager(numUsers, USERS_PER_PAGE);

  const onChangePage = (pageIndex: number) => {
    pager.goToPageIndex(pageIndex);
    setFirstItem(pager.firstItemIndex);
    setLastItem(pager.lastItemIndex);
    setCurrentPage(pager.getCurrentPageIndex());
  };

  const pagination = (
    <EuiTablePagination
      activePage={currentPage}
      itemsPerPage={USERS_PER_PAGE}
      pageCount={pager.getTotalPages()}
      onChangePage={onChangePage}
      hidePerPageOptions
    />
  );

  return (
    <>
      <EuiTable className="table table--emphasized">
        <TableHeader extraCell={isFederatedAuth} headerItems={headerItems} />
        <EuiTableBody>
          {users.slice(firstItem, lastItem + 1).map((user: IUser) => (
            <UserRow key={user.id} showEmail={!isFederatedAuth} user={user} />
          ))}
        </EuiTableBody>
      </EuiTable>
      {numUsers > USERS_PER_PAGE && pagination}
    </>
  );
};

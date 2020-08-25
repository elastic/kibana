/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';

import { useValues } from 'kea';

import { EuiTable, EuiTableBody, EuiTablePagination } from '@elastic/eui';
import { Pager } from '@elastic/eui/lib/services';

import TableHeader from 'shared/components/TableHeader';
import { UserRow } from 'workplace_search/components';

import { AppLogic, IAppValues } from 'workplace_search/App/AppLogic';
import { GroupLogic, IGroupValues } from '../GroupLogic';

const USERS_PER_PAGE = 10;

export const GroupUsersTable: React.FC = () => {
  const { isFederatedAuth } = useValues(AppLogic) as IAppValues;
  const {
    group: { users },
  } = useValues(GroupLogic) as IGroupValues;
  const headerItems = ['Username'];
  if (!isFederatedAuth) {
    headerItems.push('Email');
  }

  const [firstItem, setFirstItem] = useState(0);
  const [lastItem, setLastItem] = useState(USERS_PER_PAGE - 1);
  const [currentPage, setCurrentPage] = useState(0);

  const numUsers = users.length;
  const pager = new Pager(numUsers, USERS_PER_PAGE);

  const onChangePage = (pageIndex) => {
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
          {users.slice(firstItem, lastItem + 1).map((user) => (
            <UserRow key={user.id} showEmail={!isFederatedAuth} user={user} />
          ))}
        </EuiTableBody>
      </EuiTable>
      {numUsers > USERS_PER_PAGE && pagination}
    </>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useValues } from 'kea';

import { i18n } from '@kbn/i18n';

import { EuiTable, EuiTableBody, EuiTablePagination } from '@elastic/eui';
import { Pager } from '@elastic/eui';

import { User } from '../../../types';

import { TableHeader } from '../../../../shared/table_header';
import { UserRow } from '../../../components/shared/user_row';

import { AppLogic } from '../../../app_logic';
import { GroupLogic } from '../group_logic';

const USERS_PER_PAGE = 10;
const USERNAME_TABLE_HEADER = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.groupsUsersTable.usernameTableHeader',
  {
    defaultMessage: 'Username',
  }
);
const EMAIL_TABLE_HEADER = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.groupsUsersTable.emailTableHeader',
  {
    defaultMessage: 'Email',
  }
);

export const GroupUsersTable: React.FC = () => {
  const { isFederatedAuth } = useValues(AppLogic);
  const {
    group: { users },
  } = useValues(GroupLogic);
  const headerItems = [USERNAME_TABLE_HEADER];
  if (!isFederatedAuth) {
    headerItems.push(EMAIL_TABLE_HEADER);
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
          {users.slice(firstItem, lastItem + 1).map((user: User) => (
            <UserRow key={user.id} showEmail={!isFederatedAuth} user={user} />
          ))}
        </EuiTableBody>
      </EuiTable>
      {numUsers > USERS_PER_PAGE && pagination}
    </>
  );
};

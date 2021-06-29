/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../__mocks__/kea_logic';
import { groups } from '../../../__mocks__/groups.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiTable, EuiTablePagination } from '@elastic/eui';

import { TableHeader } from '../../../../shared/table_header';
import { User } from '../../../types';

import { GroupUsersTable } from './group_users_table';

const group = groups[0];

describe('GroupUsersTable', () => {
  it('renders', () => {
    setMockValues({ group });
    const wrapper = shallow(<GroupUsersTable />);

    expect(wrapper.find(EuiTable)).toHaveLength(1);
    expect(wrapper.find(TableHeader).prop('headerItems')).toHaveLength(2);
  });

  it('renders pagination', () => {
    const users = [] as User[];
    const NUM_TOTAL_USERS = 20;

    [...Array(NUM_TOTAL_USERS)].forEach((_, i) => {
      users.push({
        ...group.users[0],
        id: i.toString(),
      });
    });

    setMockValues({ group: { users } });
    const wrapper = shallow(<GroupUsersTable />);
    const pagination = wrapper.find(EuiTablePagination);

    // This was needed for 100% test coverage. The tests pass and 100% coverage
    // is achieved with this line, but TypeScript complains anyway, so ignoring line.
    // @ts-ignore
    pagination.invoke('onChangePage')(1);

    expect(pagination).toHaveLength(1);
  });
});

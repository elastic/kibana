/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiFlexGroup, EuiTablePagination } from '@elastic/eui';

import { TablePaginationBar } from '.';

const onChange = jest.fn();

describe('TablePaginationBar', () => {
  it('renders', () => {
    const wrapper = shallow(
      <TablePaginationBar onChangePage={onChange} totalPages={1} totalItems={10} />
    );

    expect(wrapper.find(EuiTablePagination)).toHaveLength(1);
    expect(wrapper.find(EuiFlexGroup)).toHaveLength(2);
    expect(wrapper.find(EuiTablePagination).prop('itemsPerPage')).toEqual(10);
    expect(wrapper.find(EuiTablePagination).prop('pageCount')).toEqual(1);
  });

  it('passes max page count when showAllPages false', () => {
    const wrapper = shallow(
      <TablePaginationBar onChangePage={onChange} totalPages={1000} totalItems={10000} />
    );

    expect(wrapper.find(EuiTablePagination).prop('pageCount')).toEqual(100);
  });
});

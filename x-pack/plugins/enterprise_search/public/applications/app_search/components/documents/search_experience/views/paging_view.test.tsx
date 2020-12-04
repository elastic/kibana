/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { shallow } from 'enzyme';
import { EuiPagination } from '@elastic/eui';

import { PagingView } from './paging_view';

describe('PagingView', () => {
  const props = {
    current: 1,
    totalPages: 20,
    onChange: jest.fn(),
    'aria-label': 'paging view',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    const wrapper = shallow(<PagingView {...props} />);
    expect(wrapper.find(EuiPagination).length).toBe(1);
  });

  it('passes through totalPage', () => {
    const wrapper = shallow(<PagingView {...props} />);
    expect(wrapper.find(EuiPagination).prop('pageCount')).toEqual(20);
  });

  it('passes through aria-label', () => {
    const wrapper = shallow(<PagingView {...props} />);
    expect(wrapper.find(EuiPagination).prop('aria-label')).toEqual('paging view');
  });

  it('decrements current page by 1 and passes it through as activePage', () => {
    const wrapper = shallow(<PagingView {...props} />);
    expect(wrapper.find(EuiPagination).prop('activePage')).toEqual(0);
  });

  it('calls onChange when onPageClick is triggered, and adds 1', () => {
    const wrapper = shallow(<PagingView {...props} />);
    const onPageClick: any = wrapper.find(EuiPagination).prop('onPageClick');
    onPageClick(3);
    expect(props.onChange).toHaveBeenCalledWith(4);
  });
});

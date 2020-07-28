/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { mount } from 'enzyme';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';

import { ExceptionsViewerPagination } from './exceptions_pagination';

describe('ExceptionsViewerPagination', () => {
  it('it renders passed in "pageSize" as selected option', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionsViewerPagination
          pagination={{
            pageIndex: 0,
            pageSize: 50,
            totalItemCount: 1,
            pageSizeOptions: [5, 10, 20, 50, 100],
          }}
          onPaginationChange={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="exceptionsPerPageBtn"]').at(0).text()).toEqual(
      'Items per page: 50'
    );
  });

  it('it renders all passed in page size options when per page button clicked', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionsViewerPagination
          pagination={{
            pageIndex: 0,
            pageSize: 50,
            totalItemCount: 1,
            pageSizeOptions: [20, 50, 100],
          }}
          onPaginationChange={jest.fn()}
        />
      </ThemeProvider>
    );

    wrapper.find('[data-test-subj="exceptionsPerPageBtn"] button').simulate('click');

    expect(wrapper.find('button[data-test-subj="exceptionsPerPageItem"]').at(0).text()).toEqual(
      '20 items'
    );
    expect(wrapper.find('button[data-test-subj="exceptionsPerPageItem"]').at(1).text()).toEqual(
      '50 items'
    );
    expect(wrapper.find('button[data-test-subj="exceptionsPerPageItem"]').at(2).text()).toEqual(
      '100 items'
    );
  });

  it('it invokes "onPaginationChange" when per page item is clicked', () => {
    const mockOnPaginationChange = jest.fn();
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionsViewerPagination
          pagination={{
            pageIndex: 0,
            pageSize: 50,
            totalItemCount: 1,
            pageSizeOptions: [20, 50, 100],
          }}
          onPaginationChange={mockOnPaginationChange}
        />
      </ThemeProvider>
    );

    wrapper.find('[data-test-subj="exceptionsPerPageBtn"] button').simulate('click');
    wrapper.find('button[data-test-subj="exceptionsPerPageItem"]').at(0).simulate('click');

    expect(mockOnPaginationChange).toHaveBeenCalledWith({
      filter: {},
      pagination: { pageIndex: 0, pageSize: 20, totalItemCount: 1 },
    });
  });

  it('it renders correct total page count', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionsViewerPagination
          pagination={{
            pageIndex: 0,
            pageSize: 50,
            totalItemCount: 160,
            pageSizeOptions: [20, 50, 100],
          }}
          onPaginationChange={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="exceptionsPagination"]').at(0).prop('pageCount')).toEqual(
      4
    );
    expect(
      wrapper.find('[data-test-subj="exceptionsPagination"]').at(0).prop('activePage')
    ).toEqual(0);
  });

  it('it invokes "onPaginationChange" when next clicked', () => {
    const mockOnPaginationChange = jest.fn();
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionsViewerPagination
          pagination={{
            pageIndex: 0,
            pageSize: 50,
            totalItemCount: 160,
            pageSizeOptions: [20, 50, 100],
          }}
          onPaginationChange={mockOnPaginationChange}
        />
      </ThemeProvider>
    );

    wrapper.find('[data-test-subj="pagination-button-next"]').at(1).simulate('click');

    expect(mockOnPaginationChange).toHaveBeenCalledWith({
      filter: {},
      pagination: { pageIndex: 2, pageSize: 50, totalItemCount: 160 },
    });
  });

  it('it invokes "onPaginationChange" when page clicked', () => {
    const mockOnPaginationChange = jest.fn();
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <ExceptionsViewerPagination
          pagination={{
            pageIndex: 0,
            pageSize: 50,
            totalItemCount: 160,
            pageSizeOptions: [20, 50, 100],
          }}
          onPaginationChange={mockOnPaginationChange}
        />
      </ThemeProvider>
    );

    wrapper.find('button[data-test-subj="pagination-button-3"]').simulate('click');

    expect(mockOnPaginationChange).toHaveBeenCalledWith({
      filter: {},
      pagination: { pageIndex: 4, pageSize: 50, totalItemCount: 160 },
    });
  });
});

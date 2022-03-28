/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';

import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../common/constants';

import { BasicTableProps, PaginatedTable } from './index';
import { getHostsColumns, mockData, rowItems, sortedHosts } from './index.mock';
import { ThemeProvider } from 'styled-components';
import { getMockTheme } from '../../lib/kibana/kibana_react.mock';
import { Direction } from '../../../../common/search_strategy';
import { useQueryToggle } from '../../containers/query_toggle';
jest.mock('../../containers/query_toggle');

jest.mock('react', () => {
  const r = jest.requireActual('react');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { ...r, memo: (x: any) => x };
});

const mockTheme = getMockTheme({
  eui: {
    euiColorEmptyShade: '#ece',
    euiSizeL: '10px',
    euiBreakpoints: {
      s: '450px',
    },
    paddingSizes: {
      m: '10px',
    },
  },
});

describe('Paginated Table Component', () => {
  const loadPage = jest.fn();
  const updateLimitPagination = jest.fn();
  const updateActivePage = jest.fn();
  const mockUseQueryToggle = useQueryToggle as jest.Mock;
  const mockSetToggle = jest.fn();
  const mockSetQuerySkip = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQueryToggle.mockReturnValue({ toggleStatus: true, setToggleStatus: mockSetToggle });
  });

  const testProps = {
    activePage: 0,
    columns: getHostsColumns(),
    headerCount: 1,
    headerSupplement: <p>{'My test supplement.'}</p>,
    headerTitle: 'Hosts',
    headerTooltip: 'My test tooltip',
    headerUnit: 'Test Unit',
    itemsPerRow: rowItems,
    limit: 1,
    loading: false,
    loadPage,
    pageOfItems: mockData.Hosts.edges,
    setQuerySkip: jest.fn(),
    showMorePagesIndicator: true,
    totalCount: 10,
    updateActivePage,
    updateLimitPagination: (limit: number) => updateLimitPagination({ limit }),
  };

  describe('rendering', () => {
    test('it renders the default load more table', () => {
      const wrapper = shallow(<PaginatedTable {...testProps} />);

      expect(wrapper).toMatchSnapshot();
    });

    test('it renders the loading panel at the beginning ', () => {
      const wrapper = mount(
        <ThemeProvider theme={mockTheme}>
          <PaginatedTable {...testProps} headerCount={-1} loading={true} pageOfItems={[]} />
        </ThemeProvider>
      );

      expect(
        wrapper.find('[data-test-subj="initialLoadingPanelPaginatedTable"]').exists()
      ).toBeTruthy();
    });

    test('it renders the over loading panel after data has been in the table ', () => {
      const wrapper = mount(
        <ThemeProvider theme={mockTheme}>
          <PaginatedTable {...testProps} loading={true} />
        </ThemeProvider>
      );

      expect(wrapper.find('[data-test-subj="loadingPanelPaginatedTable"]').exists()).toBeTruthy();
    });

    test('it renders the correct amount of pages and starts at activePage: 0', () => {
      const wrapper = mount(
        <ThemeProvider theme={mockTheme}>
          <PaginatedTable {...testProps} />
        </ThemeProvider>
      );

      const paginiationProps = wrapper
        .find('[data-test-subj="numberedPagination"]')
        .first()
        .props();

      const expectedPaginationProps = {
        'data-test-subj': 'numberedPagination',
        pageCount: 10,
        activePage: 0,
      };
      expect(JSON.stringify(paginiationProps)).toEqual(JSON.stringify(expectedPaginationProps));
    });

    test('it render popover to select new limit in table', () => {
      const wrapper = mount(
        <ThemeProvider theme={mockTheme}>
          <PaginatedTable {...testProps} limit={2} />
        </ThemeProvider>
      );

      wrapper.find('[data-test-subj="loadingMoreSizeRowPopover"] button').first().simulate('click');
      expect(wrapper.find('[data-test-subj="loadingMorePickSizeRow"]').exists()).toBeTruthy();
    });

    test('it will NOT render popover to select new limit in table if props itemsPerRow is empty', () => {
      const wrapper = mount(
        <ThemeProvider theme={mockTheme}>
          <PaginatedTable {...testProps} itemsPerRow={[]} limit={2} />
        </ThemeProvider>
      );

      expect(wrapper.find('[data-test-subj="loadingMoreSizeRowPopover"]').exists()).toBeFalsy();
    });

    test('It should render a sort icon if sorting is defined', () => {
      const mockOnChange = jest.fn();
      const wrapper = mount(
        <ThemeProvider theme={mockTheme}>
          <PaginatedTable
            {...testProps}
            columns={sortedHosts}
            limit={2}
            onChange={mockOnChange}
            sorting={{ direction: Direction.asc, field: 'node.host.name' }}
          />
        </ThemeProvider>
      );

      expect(wrapper.find('.euiTable thead tr th button svg')).toBeTruthy();
    });

    test('Should display toast when user reaches end of results max', () => {
      const wrapper = mount(
        <ThemeProvider theme={mockTheme}>
          <PaginatedTable
            {...testProps}
            limit={DEFAULT_MAX_TABLE_QUERY_SIZE}
            totalCount={DEFAULT_MAX_TABLE_QUERY_SIZE * 3}
          />
        </ThemeProvider>
      );
      wrapper.find('[data-test-subj="pagination-button-next"]').first().simulate('click');
      expect(updateActivePage.mock.calls.length).toEqual(0);
    });

    test('Should show items per row if totalCount is greater than items', () => {
      const wrapper = mount(
        <ThemeProvider theme={mockTheme}>
          <PaginatedTable {...testProps} limit={DEFAULT_MAX_TABLE_QUERY_SIZE} totalCount={30} />
        </ThemeProvider>
      );
      expect(wrapper.find('[data-test-subj="loadingMoreSizeRowPopover"]').exists()).toBeTruthy();
    });

    test('Should hide items per row if totalCount is less than items', () => {
      const wrapper = mount(
        <ThemeProvider theme={mockTheme}>
          <PaginatedTable {...testProps} limit={DEFAULT_MAX_TABLE_QUERY_SIZE} totalCount={1} />
        </ThemeProvider>
      );
      expect(wrapper.find('[data-test-subj="loadingMoreSizeRowPopover"]').exists()).toBeFalsy();
    });

    test('Should hide pagination if totalCount is zero', () => {
      const wrapper = mount(
        <ThemeProvider theme={mockTheme}>
          <PaginatedTable {...testProps} limit={DEFAULT_MAX_TABLE_QUERY_SIZE} totalCount={0} />
        </ThemeProvider>
      );

      expect(wrapper.find('[data-test-subj="numberedPagination"]').exists()).toBeFalsy();
    });
  });

  describe('Events', () => {
    test('should call updateActivePage with 1 when clicking to the first page', () => {
      const wrapper = mount(
        <ThemeProvider theme={mockTheme}>
          <PaginatedTable {...testProps} />
        </ThemeProvider>
      );
      wrapper.find('[data-test-subj="pagination-button-next"]').first().simulate('click');
      expect(updateActivePage.mock.calls[0][0]).toEqual(1);
    });

    test('Should call updateActivePage with 0 when you pick a new limit', () => {
      const wrapper = mount(
        <ThemeProvider theme={mockTheme}>
          <PaginatedTable {...testProps} limit={2} />
        </ThemeProvider>
      );
      wrapper.find('[data-test-subj="pagination-button-next"]').first().simulate('click');

      wrapper.find('[data-test-subj="loadingMoreSizeRowPopover"] button').first().simulate('click');

      wrapper.find('[data-test-subj="loadingMorePickSizeRow"] button').first().simulate('click');
      expect(updateActivePage.mock.calls[1][0]).toEqual(0);
    });

    test('should update the page when the activePage is changed from redux', () => {
      const ourProps: BasicTableProps<unknown> = {
        ...testProps,
        activePage: 3,
      };

      // enzyme does not allow us to pass props to child of HOC
      // so we make a component to pass it the props context
      // ComponentWithContext will pass the changed props to Component
      // https://github.com/airbnb/enzyme/issues/1853#issuecomment-443475903
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ComponentWithContext = (props: BasicTableProps<any>) => {
        return (
          <ThemeProvider theme={mockTheme}>
            <PaginatedTable {...props} />
          </ThemeProvider>
        );
      };

      const wrapper = mount(<ComponentWithContext {...ourProps} />);
      expect(
        wrapper.find('[data-test-subj="numberedPagination"]').first().prop('activePage')
      ).toEqual(3);
      wrapper.setProps({ activePage: 0 });
      wrapper.update();
      expect(
        wrapper.find('[data-test-subj="numberedPagination"]').first().prop('activePage')
      ).toEqual(0);
    });

    test('Should call updateLimitPagination when you pick a new limit', () => {
      const wrapper = mount(
        <ThemeProvider theme={mockTheme}>
          <PaginatedTable {...testProps} limit={2} />
        </ThemeProvider>
      );

      wrapper.find('[data-test-subj="loadingMoreSizeRowPopover"] button').first().simulate('click');

      wrapper.find('[data-test-subj="loadingMorePickSizeRow"] button').first().simulate('click');
      expect(updateLimitPagination).toBeCalled();
    });

    test('Should call onChange when you choose a new sort in the table', () => {
      const mockOnChange = jest.fn();
      const wrapper = mount(
        <ThemeProvider theme={mockTheme}>
          <PaginatedTable
            {...testProps}
            columns={sortedHosts}
            limit={2}
            onChange={mockOnChange}
            sorting={{ direction: Direction.asc, field: 'node.host.name' }}
          />
        </ThemeProvider>
      );

      wrapper.find('.euiTable thead tr th button').first().simulate('click');

      expect(mockOnChange).toBeCalled();
      expect(mockOnChange.mock.calls[0]).toEqual([
        { page: undefined, sort: { direction: 'desc', field: 'node.host.name' } },
      ]);
    });
  });

  describe('Toggle query', () => {
    test('toggleQuery updates toggleStatus', () => {
      const wrapper = mount(
        <ThemeProvider theme={mockTheme}>
          <PaginatedTable {...testProps} setQuerySkip={mockSetQuerySkip} />
        </ThemeProvider>
      );
      wrapper.find('[data-test-subj="query-toggle-header"]').first().simulate('click');
      expect(mockSetToggle).toBeCalledWith(false);
      expect(mockSetQuerySkip).toBeCalledWith(true);
    });

    test('toggleStatus=true, render table', () => {
      const wrapper = mount(
        <ThemeProvider theme={mockTheme}>
          <PaginatedTable {...testProps} />
        </ThemeProvider>
      );
      expect(wrapper.find('[data-test-subj="paginated-basic-table"]').first().exists()).toEqual(
        true
      );
    });

    test('toggleStatus=false, hide table', () => {
      mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: mockSetToggle });

      const wrapper = mount(
        <ThemeProvider theme={mockTheme}>
          <PaginatedTable {...testProps} />
        </ThemeProvider>
      );
      expect(wrapper.find('[data-test-subj="paginated-basic-table"]').first().exists()).toEqual(
        false
      );
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { cloneDeep } from 'lodash/fp';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import { mockTimelineResults } from '../../../../common/mock/timeline_results';
import { OpenTimelineResult } from '../types';
import { TimelinesTable, TimelinesTableProps } from '.';
import { getMockTimelinesTableProps } from './mocks';

import * as i18n from '../translations';

jest.mock('../../../../common/lib/kibana');

describe('TimelinesTable', () => {
  const theme = () => ({ eui: euiDarkVars, darkMode: true });
  let mockResults: OpenTimelineResult[];

  beforeEach(() => {
    mockResults = cloneDeep(mockTimelineResults);
  });

  test('it renders the select all timelines header checkbox when actionTimelineToShow has the action selectable', () => {
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <TimelinesTable {...getMockTimelinesTableProps(mockResults)} />
      </ThemeProvider>
    );

    expect(wrapper.find('thead tr th input').first().exists()).toBe(true);
  });

  test('it does NOT render the select all timelines header checkbox when actionTimelineToShow has not the action selectable', () => {
    const testProps: TimelinesTableProps = {
      ...getMockTimelinesTableProps(mockResults),
      actionTimelineToShow: ['delete', 'duplicate'],
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <TimelinesTable {...testProps} />
      </ThemeProvider>
    );

    expect(wrapper.find('thead tr th input').first().exists()).toBe(false);
  });

  test('it renders the Modified By column when showExtendedColumns is true ', () => {
    const testProps: TimelinesTableProps = {
      ...getMockTimelinesTableProps(mockResults),
      showExtendedColumns: true,
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <TimelinesTable {...testProps} />
      </ThemeProvider>
    );

    expect(wrapper.find('thead tr th').at(4).text()).toContain(i18n.MODIFIED_BY);
  });

  test('it renders the notes column in the position of the Modified By column when showExtendedColumns is false', () => {
    const testProps: TimelinesTableProps = {
      ...getMockTimelinesTableProps(mockResults),
      showExtendedColumns: false,
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <TimelinesTable {...testProps} />
      </ThemeProvider>
    );

    expect(
      wrapper
        .find('thead tr th')
        .at(5)
        .find('[data-test-subj="notes-count-header-icon"]')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it renders the delete timeline (trash icon) when actionTimelineToShow has the delete action', () => {
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <TimelinesTable {...getMockTimelinesTableProps(mockResults)} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="delete-timeline"]').first().exists()).toBe(true);
  });

  test('it does NOT render the delete timeline (trash icon) when actionTimelineToShow has NOT the delete action', () => {
    const testProps: TimelinesTableProps = {
      ...getMockTimelinesTableProps(mockResults),
      actionTimelineToShow: ['duplicate', 'selectable'],
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <TimelinesTable {...testProps} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="delete-timeline"]').first().exists()).toBe(false);
  });

  test('it renders the rows per page selector when showExtendedColumns is true', () => {
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <TimelinesTable {...getMockTimelinesTableProps(mockResults)} />
      </ThemeProvider>
    );

    expect(wrapper.find('EuiTablePagination EuiPopover').first().exists()).toBe(true);
  });

  test('it does NOT render the rows per page selector when showExtendedColumns is false', () => {
    const testProps: TimelinesTableProps = {
      ...getMockTimelinesTableProps(mockResults),
      showExtendedColumns: false,
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <TimelinesTable {...testProps} />
      </ThemeProvider>
    );

    expect(wrapper.find('EuiTablePagination EuiPopover').first().exists()).toBe(false);
  });

  test('it renders the default page size specified by the defaultPageSize prop', () => {
    const defaultPageSize = 123;
    const testProps = {
      ...getMockTimelinesTableProps(mockResults),
      defaultPageSize,
      pageSize: defaultPageSize,
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <TimelinesTable {...testProps} />
      </ThemeProvider>
    );

    expect(wrapper.find('EuiTablePagination EuiPopover').first().text()).toEqual(
      'Rows per page: 123'
    );
  });

  test('it sorts the Last Modified column in descending order when showExtendedColumns is true ', () => {
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <TimelinesTable {...getMockTimelinesTableProps(mockResults)} />
      </ThemeProvider>
    );

    expect(wrapper.find('[aria-sort="descending"]').first().text()).toContain(i18n.LAST_MODIFIED);
  });

  test('it sorts the Last Modified column in descending order when showExtendedColumns is false ', () => {
    const testProps: TimelinesTableProps = {
      ...getMockTimelinesTableProps(mockResults),
      showExtendedColumns: false,
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <TimelinesTable {...testProps} />
      </ThemeProvider>
    );

    expect(wrapper.find('[aria-sort="descending"]').first().text()).toContain(i18n.LAST_MODIFIED);
  });

  test('it displays the expected message when no search results are found', () => {
    const testProps: TimelinesTableProps = {
      ...getMockTimelinesTableProps(mockResults),
      searchResults: [],
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <TimelinesTable {...testProps} />
      </ThemeProvider>
    );

    expect(wrapper.find('tbody tr td div').first().text()).toEqual(i18n.ZERO_TIMELINES_MATCH);
  });

  test('it invokes onTableChange with the expected parameters when a table header is clicked to sort it', () => {
    const onTableChange = jest.fn();
    const testProps: TimelinesTableProps = {
      ...getMockTimelinesTableProps(mockResults),
      onTableChange,
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <TimelinesTable {...testProps} />
      </ThemeProvider>
    );

    wrapper.find('thead tr th button').at(0).simulate('click');

    wrapper.update();

    expect(onTableChange).toHaveBeenCalledWith({
      page: { index: 0, size: 10 },
      sort: { direction: 'asc', field: 'updated' },
    });
  });

  test('it invokes onSelectionChange when a row is selected', () => {
    const onSelectionChange = jest.fn();
    const testProps: TimelinesTableProps = {
      ...getMockTimelinesTableProps(mockResults),
      onSelectionChange,
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <TimelinesTable {...testProps} />
      </ThemeProvider>
    );

    wrapper
      .find('thead tr th input')
      .at(0)
      .simulate('change', { target: { checked: true } });

    wrapper.update();

    expect(onSelectionChange).toHaveBeenCalled();
  });

  test('it enables the table loading animation when isLoading is true', () => {
    const testProps: TimelinesTableProps = {
      ...getMockTimelinesTableProps(mockResults),
      loading: true,
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <TimelinesTable {...testProps} />
      </ThemeProvider>
    );

    const props = wrapper
      .find('[data-test-subj="timelines-table"]')
      .first()
      .props() as TimelinesTableProps;

    expect(props.loading).toBe(true);
  });

  test('it disables the table loading animation when isLoading is false', () => {
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <TimelinesTable {...getMockTimelinesTableProps(mockResults)} />
      </ThemeProvider>
    );

    const props = wrapper
      .find('[data-test-subj="timelines-table"]')
      .first()
      .props() as TimelinesTableProps;

    expect(props.loading).toBe(false);
  });
});

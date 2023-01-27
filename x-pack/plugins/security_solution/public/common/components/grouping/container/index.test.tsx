/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, within } from '@testing-library/react';
import React from 'react';
import { GroupingContainer } from '..';
import { TestProviders } from '../../../mock';
import { createGroupFilter } from '../accordion_panel/helpers';

const renderChildComponent = jest.fn();
const takeActionItems = jest.fn();
const rule1Name = 'Rule 1 name';
const rule1Desc = 'Rule 1 description';
const rule2Name = 'Rule 2 name';
const rule2Desc = 'Rule 2 description';

const testProps = {
  data: {
    groupsNumber: {
      value: 2,
    },
    stackByMultipleFields0: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: [rule1Name, rule1Desc],
          key_as_string: `${rule1Name}|${rule1Desc}`,
          doc_count: 1,
          hostsCountAggregation: {
            value: 1,
          },
          ruleTags: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
          alertsCount: {
            value: 1,
          },
          severitiesSubAggregation: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'low',
                doc_count: 1,
              },
            ],
          },
          countSeveritySubAggregation: {
            value: 1,
          },
          usersCountAggregation: {
            value: 1,
          },
        },
        {
          key: [rule2Name, rule2Desc],
          key_as_string: `${rule2Name}|${rule2Desc}`,
          doc_count: 1,
          hostsCountAggregation: {
            value: 1,
          },
          ruleTags: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
          alertsCount: {
            value: 1,
          },
          severitiesSubAggregation: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'low',
                doc_count: 1,
              },
            ],
          },
          countSeveritySubAggregation: {
            value: 1,
          },
          usersCountAggregation: {
            value: 1,
          },
        },
      ],
    },
    alertsCount: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: 'siem',
          doc_count: 2,
        },
      ],
    },
  },
  pagination: {
    pageIndex: 0,
    pageSize: 25,
    onChangeItemsPerPage: jest.fn(),
    onChangePage: jest.fn(),
  },
  renderChildComponent,
  selectedGroup: 'kibana.alert.rule.name',
  takeActionItems,
};

describe('grouping container', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('Renders group counts when groupsNumber > 0', () => {
    const { getByTestId, getAllByTestId, queryByTestId } = render(
      <TestProviders>
        <GroupingContainer {...testProps} />
      </TestProviders>
    );
    expect(getByTestId('alert-count').textContent).toBe('2 alerts');
    expect(getByTestId('groups-count').textContent).toBe('2 groups');
    expect(getAllByTestId('grouping-accordion').length).toBe(2);
    expect(queryByTestId('empty-results-panel')).not.toBeInTheDocument();
  });

  it('Does not render group counts when groupsNumber = 0', () => {
    const data = {
      groupsNumber: {
        value: 0,
      },
      stackByMultipleFields0: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [],
      },
      alertsCount: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [],
      },
    };
    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <GroupingContainer {...testProps} data={data} />
      </TestProviders>
    );
    expect(queryByTestId('alert-count')).not.toBeInTheDocument();
    expect(queryByTestId('groups-count')).not.toBeInTheDocument();
    expect(queryByTestId('grouping-accordion')).not.toBeInTheDocument();
    expect(getByTestId('empty-results-panel')).toBeInTheDocument();
  });

  it.only('Opens one group at a time when each group is clicked', () => {
    const { getAllByTestId } = render(
      <TestProviders>
        <GroupingContainer {...testProps} />
      </TestProviders>
    );
    const group1 = within(getAllByTestId('grouping-accordion')[0]).getAllByRole('button')[0];
    const group2 = within(getAllByTestId('grouping-accordion')[1]).getAllByRole('button')[0];
    fireEvent.click(group1);
    expect(renderChildComponent).toHaveBeenNthCalledWith(
      1,
      createGroupFilter(testProps.selectedGroup, rule1Name)
    );
    fireEvent.click(group2);
    expect(renderChildComponent).toHaveBeenNthCalledWith(
      2,
      createGroupFilter(testProps.selectedGroup, rule2Name)
    );
  });
});

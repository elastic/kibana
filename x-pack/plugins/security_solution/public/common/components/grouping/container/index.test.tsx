/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { GroupingContainer } from '..';
import { TestProviders } from '../../../mock';

const renderChildComponent = jest.fn();
const takeActionItems = jest.fn();
const testProps = {
  data: {
    groupsNumber: {
      value: 2,
    },
    stackByMupltipleFields0: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: ['has host name', 'f'],
          key_as_string: 'has host name|f',
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
          key: ['has user name', 'f'],
          key_as_string: 'has user name|f',
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
  it('Renders grouping containers', () => {
    const { getByTestId } = render(
      <TestProviders>
        <GroupingContainer {...testProps} />
      </TestProviders>
    );
    expect(getByTestId('grouping-container-header')).toBeInTheDocument();
    expect(getByTestId('grouping-container')).toBeInTheDocument();
  });
});

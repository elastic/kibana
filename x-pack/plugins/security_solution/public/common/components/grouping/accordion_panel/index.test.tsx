/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render } from '@testing-library/react';
import { GroupPanel } from '.';
import { createGroupFilter } from './helpers';
import React from 'react';

const onToggleGroup = jest.fn();
const renderChildComponent = jest.fn();
const ruleName = 'Rule name';
const ruleDesc = 'Rule description';

const testProps = {
  groupBucket: {
    key: [ruleName, ruleDesc],
    key_as_string: `${ruleName}|${ruleDesc}`,
    doc_count: 98,
    hostsCountAggregation: {
      value: 5,
    },
    ruleTags: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [],
    },
    alertsCount: {
      value: 98,
    },
    rulesCountAggregation: {
      value: 1,
    },
    severitiesSubAggregation: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: 'low',
          doc_count: 98,
        },
      ],
    },
    countSeveritySubAggregation: {
      value: 1,
    },
    usersCountAggregation: {
      value: 98,
    },
  },
  renderChildComponent,
  selectedGroup: 'kibana.alert.rule.name',
};

describe('grouping accordion panel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('creates the query for the selectedGroup attribute', () => {
    const { getByTestId } = render(<GroupPanel {...testProps} />);
    expect(getByTestId('grouping-accordion')).toBeInTheDocument();
    expect(renderChildComponent).toHaveBeenCalledWith(
      createGroupFilter(testProps.selectedGroup, ruleName)
    );
  });
  it('does not create query without a valid groupFieldValue', () => {
    const { queryByTestId } = render(
      <GroupPanel
        {...testProps}
        groupBucket={{
          ...testProps.groupBucket,
          // @ts-ignore
          key: null,
        }}
      />
    );
    expect(queryByTestId('grouping-accordion')).not.toBeInTheDocument();
    expect(renderChildComponent).not.toHaveBeenCalled();
  });
  it('When onToggleGroup not defined, does nothing on toggle', () => {
    const { container } = render(<GroupPanel {...testProps} />);
    fireEvent.click(container.querySelector('[data-test-subj="grouping-accordion"] button')!);
    expect(onToggleGroup).not.toHaveBeenCalled();
  });
  it('When onToggleGroup is defined, calls function with proper args on toggle', () => {
    const { container } = render(<GroupPanel {...testProps} onToggleGroup={onToggleGroup} />);
    fireEvent.click(container.querySelector('[data-test-subj="grouping-accordion"] button')!);
    expect(onToggleGroup).toHaveBeenCalledWith(true, testProps.groupBucket);
  });
});

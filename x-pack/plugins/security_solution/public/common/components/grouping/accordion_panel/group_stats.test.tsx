/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { GroupStats } from './group_stats';
import { TestProviders } from '../../../mock';

const onTakeActionsOpen = jest.fn();
const testProps = {
  badgeMetricStats: [
    { title: "IP's:", value: 1 },
    { title: 'Rules:', value: 2 },
    { title: 'Alerts:', value: 2, width: 50, color: '#a83632' },
  ],
  bucket: {
    key: '9nk5mo2fby',
    doc_count: 2,
    hostsCountAggregation: { value: 1 },
    ruleTags: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
    alertsCount: { value: 2 },
    rulesCountAggregation: { value: 2 },
    severitiesSubAggregation: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [{ key: 'low', doc_count: 2 }],
    },
    countSeveritySubAggregation: { value: 1 },
    usersCountAggregation: { value: 1 },
  },
  onTakeActionsOpen,
  customMetricStats: [
    {
      title: 'Severity',
      customStatRenderer: <p data-test-subj="customMetricStat" />,
    },
  ],
  takeActionItems: [
    <p data-test-subj="takeActionItem-1" key={1} />,
    <p data-test-subj="takeActionItem-2" key={2} />,
  ],
};
describe('Group stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('renders each stat item', () => {
    const { getByTestId } = render(
      <TestProviders>
        <GroupStats {...testProps} />
      </TestProviders>
    );
    expect(getByTestId('group-stats')).toBeInTheDocument();
    testProps.badgeMetricStats.forEach(({ title: stat }) => {
      expect(getByTestId(`metric-${stat}`)).toBeInTheDocument();
    });
    testProps.customMetricStats.forEach(({ title: stat }) => {
      expect(getByTestId(`customMetric-${stat}`)).toBeInTheDocument();
    });
  });
  it('when onTakeActionsOpen is defined, call onTakeActionsOpen on popover click', () => {
    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <GroupStats {...testProps} />
      </TestProviders>
    );
    fireEvent.click(getByTestId('take-action-button'));
    expect(onTakeActionsOpen).toHaveBeenCalled();
    ['takeActionItem-1', 'takeActionItem-2'].forEach((actionItem) => {
      expect(queryByTestId(actionItem)).not.toBeInTheDocument();
    });
  });
  it('when onTakeActionsOpen is undefined, render take actions dropdown on popover click', () => {
    const { getByTestId } = render(
      <TestProviders>
        <GroupStats {...testProps} onTakeActionsOpen={undefined} />
      </TestProviders>
    );
    fireEvent.click(getByTestId('take-action-button'));
    ['takeActionItem-1', 'takeActionItem-2'].forEach((actionItem) => {
      expect(getByTestId(actionItem)).toBeInTheDocument();
    });
  });
});

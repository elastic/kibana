/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { RuleAlertsTable, RuleAlertsTableProps } from './rule_alerts_table';
import { RuleAlertsItem, UseRuleAlertsItems } from './rule_alerts_items';
import moment from 'moment';
import { SecurityPageName } from '../../../../../common/constants';

const mockGetAppUrl = jest.fn();
jest.mock('../../../../common/lib/kibana/hooks', () => {
  const original = jest.requireActual('../../../../common/lib/kibana/hooks');
  return {
    ...original,
    useNavigation: () => ({
      getAppUrl: mockGetAppUrl,
    }),
  };
});

type UseRuleAlertsItemsReturn = ReturnType<UseRuleAlertsItems>;
const defaultUseRuleAlertsItemsReturn: UseRuleAlertsItemsReturn = {
  items: [],
  isLoading: false,
};
const mockUseRuleAlertsItems = jest.fn(() => defaultUseRuleAlertsItemsReturn);
const mockUseRuleAlertsItemsReturn = (param: Partial<UseRuleAlertsItemsReturn>) => {
  mockUseRuleAlertsItems.mockReturnValueOnce({ ...defaultUseRuleAlertsItemsReturn, ...param });
};
jest.mock('./rule_alerts_items', () => ({
  useRuleAlertsItems: () => mockUseRuleAlertsItems(),
}));

const defaultProps: RuleAlertsTableProps = {
  signalIndexName: '',
};
const items: RuleAlertsItem[] = [
  {
    id: 'ruleId',
    name: 'ruleName',
    last_alert_at: moment().subtract(1, 'day').format(),
    alert_count: 10,
    severity: 'high',
  },
];

describe('RuleAlertsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render empty table', () => {
    const result = render(
      <TestProviders>
        <RuleAlertsTable {...defaultProps} />
      </TestProviders>
    );

    expect(result.getByText('No alerts to display')).toBeInTheDocument();
    expect(result.queryByTestId('ruleAlertsTable-openAlertsButton')).not.toBeInTheDocument();
  });

  it('should render a loading table', () => {
    mockUseRuleAlertsItemsReturn({ isLoading: true });
    const result = render(
      <TestProviders>
        <RuleAlertsTable {...defaultProps} />
      </TestProviders>
    );

    const table = result.getByTestId('ruleAlertsTable');
    expect(table).toBeInTheDocument();
    expect(table).toHaveClass('euiBasicTable-loading');
    expect(result.queryByTestId('ruleAlertsTable-openAlertsButton')).toBeInTheDocument();
  });

  it('should render the table columns', () => {
    mockUseRuleAlertsItemsReturn({ items });
    const result = render(
      <TestProviders>
        <RuleAlertsTable {...defaultProps} />
      </TestProviders>
    );

    expect(result.getAllByText('Rule name').at(0)).toBeInTheDocument();
    expect(result.getAllByText('Last alert').at(0)).toBeInTheDocument();
    expect(result.getAllByText('Alert count').at(0)).toBeInTheDocument();
    expect(result.getAllByText('Severity').at(0)).toBeInTheDocument();
  });

  it('should render the table items', () => {
    mockUseRuleAlertsItemsReturn({ items });
    const result = render(
      <TestProviders>
        <RuleAlertsTable {...defaultProps} />
      </TestProviders>
    );

    expect(result.getByText('ruleName')).toBeInTheDocument();
    expect(result.getByText('yesterday')).toBeInTheDocument();
    expect(result.getByText('10')).toBeInTheDocument();
    expect(result.getByText('High')).toBeInTheDocument();
  });

  it('should generate the table items links', () => {
    mockUseRuleAlertsItemsReturn({ items });
    render(
      <TestProviders>
        <RuleAlertsTable {...defaultProps} />
      </TestProviders>
    );

    expect(mockGetAppUrl).toBeCalledWith({
      deepLinkId: SecurityPageName.rules,
      path: `id/${items[0].id}`,
    });

    expect(mockGetAppUrl).toBeCalledWith({
      deepLinkId: SecurityPageName.alerts,
      path: `?query=(language:kuery,query:'kibana.alert.rule.uuid: ${items[0].id}')`,
    });
  });
});

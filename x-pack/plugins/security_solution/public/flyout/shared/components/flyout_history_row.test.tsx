/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import {
  FlyoutHistoryRow,
  RuleHistoryRow,
  DocumentDetailsHistoryRow,
  GenericHistoryRow,
} from './flyout_history_row';
import { TestProviders } from '../../../common/mock';
import type { RuleResponse } from '../../../../common/api/detection_engine';
import { useExpandableFlyoutApi, type ExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useRuleWithFallback } from '../../../detection_engine/rule_management/logic/use_rule_with_fallback';
import { useRuleDetails } from '../../rule_details/hooks/use_rule_details';
import {
  useBasicDataFromDetailsData,
  type UseBasicDataFromDetailsDataResult,
} from '../../document_details/shared/hooks/use_basic_data_from_details_data';
import { DocumentDetailsRightPanelKey } from '../../document_details/shared/constants/panel_keys';
import { RulePanelKey } from '../../rule_details/right';
import { UserPanelKey } from '../../entity_details/user_right';
import { HostPanelKey } from '../../entity_details/host_right';
import { NetworkPanelKey } from '../../network_details';
import {
  DOCUMENT_DETAILS_HISTORY_ROW_TEST_ID,
  RULE_HISTORY_ROW_TEST_ID,
  GENERIC_HISTORY_ROW_TEST_ID,
} from './test_ids';

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: jest.fn(),
  useExpandableFlyoutState: jest.fn(),
  useExpandableFlyoutHistory: jest.fn(),
  ExpandableFlyoutProvider: ({ children }: React.PropsWithChildren<{}>) => <>{children}</>,
}));

jest.mock('../../../detection_engine/rule_management/logic/use_rule_with_fallback');
jest.mock('../../document_details/shared/hooks/use_basic_data_from_details_data');
jest.mock('../../rule_details/hooks/use_rule_details');
const flyoutContextValue = {
  openFlyout: jest.fn(),
} as unknown as ExpandableFlyoutApi;

const rowItems = {
  alert: {
    id: DocumentDetailsRightPanelKey,
    params: {
      id: 'eventId',
      indexName: 'indexName',
      scopeId: 'scopeId',
    },
  },
  rule: {
    id: RulePanelKey,
    params: { ruleId: 'ruleId' },
  },
  host: {
    id: HostPanelKey,
    params: { hostName: 'host name' },
  },
  user: {
    id: UserPanelKey,
    params: { userName: 'user name' },
  },
  network: {
    id: NetworkPanelKey,
    params: { ip: 'ip' },
  },
};

const mockedRuleResponse = {
  rule: null,
  loading: false,
  isExistingRule: false,
  error: null,
  refresh: jest.fn(),
};

describe('FlyoutHistoryRow', () => {
  beforeEach(() => {
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(flyoutContextValue);
    jest.mocked(useRuleDetails).mockReturnValue({
      rule: null,
      loading: false,
      isExistingRule: false,
    });
    jest.mocked(useRuleWithFallback).mockReturnValue({
      ...mockedRuleResponse,
      rule: { name: 'rule name' } as RuleResponse,
    });
    jest
      .mocked(useBasicDataFromDetailsData)
      .mockReturnValue({ isAlert: false, ruleId: 'ruleId' } as UseBasicDataFromDetailsDataResult);
  });

  it('renders document details history row when key is alert', () => {
    const { getByTestId } = render(
      <TestProviders>
        <FlyoutHistoryRow item={rowItems.alert} index={0} />
      </TestProviders>
    );
    expect(getByTestId(`${0}-${DOCUMENT_DETAILS_HISTORY_ROW_TEST_ID}`)).toBeInTheDocument();
  });

  it('renders rule history row when key is rule', () => {
    const { getByTestId } = render(
      <TestProviders>
        <FlyoutHistoryRow item={rowItems.rule} index={1} />
      </TestProviders>
    );
    expect(getByTestId(`${1}-${RULE_HISTORY_ROW_TEST_ID}`)).toBeInTheDocument();
  });

  it('renders generic host history row when key is host', () => {
    const { getByTestId } = render(
      <TestProviders>
        <FlyoutHistoryRow item={rowItems.host} index={2} />
      </TestProviders>
    );
    expect(getByTestId(`${2}-${GENERIC_HISTORY_ROW_TEST_ID}`)).toBeInTheDocument();
    expect(getByTestId(`${2}-${GENERIC_HISTORY_ROW_TEST_ID}`)).toHaveTextContent('Host: host name');
  });

  it('renders generic user history row when key is user', () => {
    const { getByTestId } = render(
      <TestProviders>
        <FlyoutHistoryRow item={rowItems.user} index={3} />
      </TestProviders>
    );
    expect(getByTestId(`${3}-${GENERIC_HISTORY_ROW_TEST_ID}`)).toBeInTheDocument();
    expect(getByTestId(`${3}-${GENERIC_HISTORY_ROW_TEST_ID}`)).toHaveTextContent('User: user name');
  });

  it('renders generic network history row when key is network', () => {
    const { getByTestId } = render(
      <TestProviders>
        <FlyoutHistoryRow item={rowItems.network} index={4} />
      </TestProviders>
    );
    expect(getByTestId(`${4}-${GENERIC_HISTORY_ROW_TEST_ID}`)).toBeInTheDocument();
    expect(getByTestId(`${4}-${GENERIC_HISTORY_ROW_TEST_ID}`)).toHaveTextContent('Network: ip');
  });
});

describe('DocumentDetailsHistoryRow', () => {
  it('renders alert title when isAlert is true and rule name is defined', () => {
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(flyoutContextValue);
    jest.mocked(useRuleWithFallback).mockReturnValue({
      ...mockedRuleResponse,
      rule: { name: 'rule name' } as RuleResponse,
    });
    jest
      .mocked(useBasicDataFromDetailsData)
      .mockReturnValue({ isAlert: true } as UseBasicDataFromDetailsDataResult);

    const { getByTestId } = render(
      <TestProviders>
        <DocumentDetailsHistoryRow item={rowItems.alert} index={0} />
      </TestProviders>
    );
    expect(getByTestId(`${0}-${DOCUMENT_DETAILS_HISTORY_ROW_TEST_ID}`)).toHaveTextContent(
      'Alert: rule name'
    );
  });

  it('renders default alert title when isAlert is true and rule name is undefined', () => {
    jest.mocked(useRuleWithFallback).mockReturnValue(mockedRuleResponse);
    jest
      .mocked(useBasicDataFromDetailsData)
      .mockReturnValue({ isAlert: true } as UseBasicDataFromDetailsDataResult);

    const { getByTestId } = render(
      <TestProviders>
        <DocumentDetailsHistoryRow item={rowItems.alert} index={0} />
      </TestProviders>
    );
    expect(getByTestId(`${0}-${DOCUMENT_DETAILS_HISTORY_ROW_TEST_ID}`)).toHaveTextContent(
      'Document details'
    );
  });

  it('renders event title when isAlert is false', () => {
    jest.mocked(useRuleWithFallback).mockReturnValue(mockedRuleResponse);
    jest
      .mocked(useBasicDataFromDetailsData)
      .mockReturnValue({ isAlert: false } as UseBasicDataFromDetailsDataResult);

    const { getByTestId } = render(
      <TestProviders>
        <DocumentDetailsHistoryRow item={rowItems.alert} index={0} />
      </TestProviders>
    );
    expect(getByTestId(`${0}-${DOCUMENT_DETAILS_HISTORY_ROW_TEST_ID}`)).toHaveTextContent(
      'Event details'
    );
  });

  it('opens document details flyout when clicked', () => {
    const { getByTestId } = render(
      <TestProviders>
        <DocumentDetailsHistoryRow item={rowItems.alert} index={0} />
      </TestProviders>
    );
    fireEvent.click(getByTestId(`${0}-${DOCUMENT_DETAILS_HISTORY_ROW_TEST_ID}`));
    expect(flyoutContextValue.openFlyout).toHaveBeenCalledWith({ right: rowItems.alert });
  });
});

describe('RuleHistoryRow', () => {
  beforeEach(() => {
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(flyoutContextValue);
    jest.mocked(useRuleDetails).mockReturnValue({
      rule: { name: 'rule name' } as RuleResponse,
      loading: false,
      isExistingRule: false,
    });
  });

  it('renders', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RuleHistoryRow item={rowItems.rule} index={0} />
      </TestProviders>
    );
    expect(getByTestId(`${0}-${RULE_HISTORY_ROW_TEST_ID}`)).toHaveTextContent('Rule: rule name');
    expect(useRuleDetails).toHaveBeenCalledWith({ ruleId: rowItems.rule.params.ruleId });
  });

  it('opens rule details flyout when clicked', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RuleHistoryRow item={rowItems.rule} index={0} />
      </TestProviders>
    );
    fireEvent.click(getByTestId(`${0}-${RULE_HISTORY_ROW_TEST_ID}`));
    expect(flyoutContextValue.openFlyout).toHaveBeenCalledWith({ right: rowItems.rule });
  });
});

describe('GenericHistoryRow', () => {
  beforeEach(() => {
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(flyoutContextValue);
  });

  it('renders', () => {
    const { getByTestId } = render(
      <TestProviders>
        <GenericHistoryRow
          item={rowItems.host}
          name="Row name"
          icon={'user'}
          title="title"
          index={0}
        />
      </TestProviders>
    );
    expect(getByTestId(`${0}-${GENERIC_HISTORY_ROW_TEST_ID}`)).toHaveTextContent('Row name: title');
    fireEvent.click(getByTestId(`${0}-${GENERIC_HISTORY_ROW_TEST_ID}`));
    expect(flyoutContextValue.openFlyout).toHaveBeenCalledWith({ right: rowItems.host });
  });
});

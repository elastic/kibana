/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../common/mock';
import { mockContextValue } from '../mocks/mock_context';
import { RuleOverviewPanelContext } from '../context';
import { RULE_OVERVIEW_FOOTER_TEST_ID, RULE_OVERVIEW_NAVIGATE_TO_RULE_TEST_ID } from './test_ids';
import { RuleFooter } from './footer';
import { useRuleDetailsLink } from '../../shared/hooks/use_rule_details_link';

jest.mock('../../shared/hooks/use_rule_details_link');

const renderRulePreviewFooter = (contextValue: RuleOverviewPanelContext) =>
  render(
    <TestProviders>
      <RuleOverviewPanelContext.Provider value={contextValue}>
        <RuleFooter />
      </RuleOverviewPanelContext.Provider>
    </TestProviders>
  );

describe('<RulePreviewFooter />', () => {
  it('renders rule details link correctly when ruleId is available', () => {
    (useRuleDetailsLink as jest.Mock).mockReturnValue('rule_details_link');

    const { getByTestId } = renderRulePreviewFooter(mockContextValue);

    expect(getByTestId(RULE_OVERVIEW_FOOTER_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RULE_OVERVIEW_NAVIGATE_TO_RULE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RULE_OVERVIEW_NAVIGATE_TO_RULE_TEST_ID)).toHaveTextContent(
      'Show full rule details'
    );
  });

  it('should not render rule details link when ruleId is not available', () => {
    (useRuleDetailsLink as jest.Mock).mockReturnValue(null);

    const { queryByTestId } = renderRulePreviewFooter(mockContextValue);

    expect(queryByTestId(RULE_OVERVIEW_FOOTER_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(RULE_OVERVIEW_NAVIGATE_TO_RULE_TEST_ID)).not.toBeInTheDocument();
  });
});

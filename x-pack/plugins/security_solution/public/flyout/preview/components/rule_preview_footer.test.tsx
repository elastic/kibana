/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../common/mock';
import { mockContextValue } from '../mocks/mock_preview_panel_context';
import { PreviewPanelContext } from '../context';
import { RULE_PREVIEW_FOOTER_TEST_ID, RULE_PREVIEW_NAVIGATE_TO_RULE_TEST_ID } from './test_ids';
import { RulePreviewFooter } from './rule_preview_footer';

const contextValue = {
  ...mockContextValue,
  ruleId: 'rule id',
};

describe('<RulePreviewFooter />', () => {
  it('renders rule details link correctly when ruleId is available', () => {
    const { getByTestId } = render(
      <TestProviders>
        <PreviewPanelContext.Provider value={contextValue}>
          <RulePreviewFooter />
        </PreviewPanelContext.Provider>
      </TestProviders>
    );

    expect(getByTestId(RULE_PREVIEW_FOOTER_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RULE_PREVIEW_NAVIGATE_TO_RULE_TEST_ID)).toBeInTheDocument();
  });

  it('should not render rule details link when ruleId is not available', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <PreviewPanelContext.Provider value={mockContextValue}>
          <RulePreviewFooter />
        </PreviewPanelContext.Provider>
      </TestProviders>
    );

    expect(queryByTestId(RULE_PREVIEW_FOOTER_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(RULE_PREVIEW_NAVIGATE_TO_RULE_TEST_ID)).not.toBeInTheDocument();
  });
});

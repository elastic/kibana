/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { RulePreview } from './rule_preview';
import { PreviewPanelContext } from '../context';
import { mockContextValue } from '../mocks/mock_preview_panel_context';
import { mockFlyoutContextValue } from '../../shared/mocks/mock_flyout_context';
import { ExpandableFlyoutContext } from '@kbn/expandable-flyout/src/context';
import { useRuleWithFallback } from '../../../detection_engine/rule_management/logic/use_rule_with_fallback';
import {
  RULE_PREVIEW_BODY_TEST_ID,
  RULE_PREVIEW_ABOUT_HEADER_TEST_ID,
  RULE_PREVIEW_ABOUT_CONTENT_TEST_ID,
  RULE_PREVIEW_DEFINITION_HEADER_TEST_ID,
  RULE_PREVIEW_DEFINITION_CONTENT_TEST_ID,
  RULE_PREVIEW_SCHEDULE_HEADER_TEST_ID,
  RULE_PREVIEW_SCHEDULE_CONTENT_TEST_ID,
} from './test_ids';

const mockUseRuleWithFallback = useRuleWithFallback as jest.Mock;
jest.mock('../../../detection_engine/rule_management/logic/use_rule_with_fallback');

const contextValue = {
  ...mockContextValue,
  ruleId: 'rule id',
};
describe('<RulePreview />', () => {
  it('should render rule preview and its sub sections', () => {
    mockUseRuleWithFallback.mockReturnValue({
      rule: { name: 'rule name', description: 'rule description' },
    });
    const { getByTestId } = render(
      <ExpandableFlyoutContext.Provider value={mockFlyoutContextValue}>
        <PreviewPanelContext.Provider value={contextValue}>
          <RulePreview />
        </PreviewPanelContext.Provider>
      </ExpandableFlyoutContext.Provider>
    );
    expect(getByTestId(RULE_PREVIEW_BODY_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RULE_PREVIEW_ABOUT_HEADER_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RULE_PREVIEW_ABOUT_CONTENT_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RULE_PREVIEW_DEFINITION_HEADER_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RULE_PREVIEW_DEFINITION_CONTENT_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RULE_PREVIEW_SCHEDULE_HEADER_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RULE_PREVIEW_SCHEDULE_CONTENT_TEST_ID)).toBeInTheDocument();
  });

  it('should not render rule preview when rule is null', () => {
    mockUseRuleWithFallback.mockReturnValue({});
    const { queryByTestId } = render(
      <ExpandableFlyoutContext.Provider value={mockFlyoutContextValue}>
        <PreviewPanelContext.Provider value={contextValue}>
          <RulePreview />
        </PreviewPanelContext.Provider>
      </ExpandableFlyoutContext.Provider>
    );
    expect(queryByTestId(RULE_PREVIEW_BODY_TEST_ID)).not.toBeInTheDocument();
  });
});

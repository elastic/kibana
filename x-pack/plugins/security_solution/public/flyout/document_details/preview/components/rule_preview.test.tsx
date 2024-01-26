/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import { RulePreview } from './rule_preview';
import { PreviewPanelContext } from '../context';
import { mockContextValue } from '../mocks/mock_context';
import { ThemeProvider } from 'styled-components';
import { getMockTheme } from '../../../../common/lib/kibana/kibana_react.mock';
import { TestProviders } from '../../../../common/mock';
import { TestProvider } from '@kbn/expandable-flyout/src/test/provider';
import { useRuleWithFallback } from '../../../../detection_engine/rule_management/logic/use_rule_with_fallback';
import { getStepsData } from '../../../../detections/pages/detection_engine/rules/helpers';
import {
  mockAboutStepRule,
  mockDefineStepRule,
  mockScheduleStepRule,
} from '../../../../detection_engine/rule_management_ui/components/rules_table/__mocks__/mock';
import { useGetSavedQuery } from '../../../../detections/pages/detection_engine/rules/use_get_saved_query';
import {
  RULE_PREVIEW_BODY_TEST_ID,
  RULE_PREVIEW_ABOUT_HEADER_TEST_ID,
  RULE_PREVIEW_ABOUT_CONTENT_TEST_ID,
  RULE_PREVIEW_DEFINITION_HEADER_TEST_ID,
  RULE_PREVIEW_DEFINITION_CONTENT_TEST_ID,
  RULE_PREVIEW_SCHEDULE_HEADER_TEST_ID,
  RULE_PREVIEW_SCHEDULE_CONTENT_TEST_ID,
  RULE_PREVIEW_ACTIONS_HEADER_TEST_ID,
  RULE_PREVIEW_ACTIONS_CONTENT_TEST_ID,
  RULE_PREVIEW_LOADING_TEST_ID,
} from './test_ids';

jest.mock('../../../../common/lib/kibana');

const mockUseRuleWithFallback = useRuleWithFallback as jest.Mock;
jest.mock('../../../../detection_engine/rule_management/logic/use_rule_with_fallback');

const mockGetStepsData = getStepsData as jest.Mock;
jest.mock('../../../../detections/pages/detection_engine/rules/helpers');

const mockUseGetSavedQuery = useGetSavedQuery as jest.Mock;
jest.mock('../../../../detections/pages/detection_engine/rules/use_get_saved_query');

const mockTheme = getMockTheme({ eui: { euiColorMediumShade: '#ece' } });

const contextValue = {
  ...mockContextValue,
  ruleId: 'rule id',
};

const renderRulePreview = () =>
  render(
    <TestProviders>
      <ThemeProvider theme={mockTheme}>
        <TestProvider>
          <PreviewPanelContext.Provider value={contextValue}>
            <RulePreview />
          </PreviewPanelContext.Provider>
        </TestProvider>
      </ThemeProvider>
    </TestProviders>
  );

const NO_DATA_MESSAGE = 'There was an error displaying data.';

describe('<RulePreview />', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockUseGetSavedQuery.mockReturnValue({ isSavedQueryLoading: false, savedQueryBar: null });
  });

  it('should render rule preview and its sub sections', async () => {
    mockUseRuleWithFallback.mockReturnValue({
      rule: { name: 'rule name', description: 'rule description' },
    });
    mockGetStepsData.mockReturnValue({
      aboutRuleData: mockAboutStepRule(),
      defineRuleData: mockDefineStepRule(),
      scheduleRuleData: mockScheduleStepRule(),
      ruleActionsData: { actions: ['action'] },
    });

    const { getByTestId } = renderRulePreview();

    await act(async () => {
      expect(getByTestId(RULE_PREVIEW_BODY_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(RULE_PREVIEW_ABOUT_HEADER_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(RULE_PREVIEW_ABOUT_HEADER_TEST_ID)).toHaveTextContent('About');
      expect(getByTestId(RULE_PREVIEW_ABOUT_CONTENT_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(RULE_PREVIEW_DEFINITION_HEADER_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(RULE_PREVIEW_DEFINITION_HEADER_TEST_ID)).toHaveTextContent('Definition');
      expect(getByTestId(RULE_PREVIEW_DEFINITION_CONTENT_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(RULE_PREVIEW_SCHEDULE_HEADER_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(RULE_PREVIEW_SCHEDULE_HEADER_TEST_ID)).toHaveTextContent('Schedule');
      expect(getByTestId(RULE_PREVIEW_SCHEDULE_CONTENT_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(RULE_PREVIEW_ACTIONS_HEADER_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(RULE_PREVIEW_ACTIONS_HEADER_TEST_ID)).toHaveTextContent('Actions');
      expect(getByTestId(RULE_PREVIEW_ACTIONS_CONTENT_TEST_ID)).toBeInTheDocument();
    });
  });

  it('should not render actions if action is not available', async () => {
    mockUseRuleWithFallback.mockReturnValue({
      rule: { name: 'rule name', description: 'rule description' },
    });
    mockGetStepsData.mockReturnValue({
      aboutRuleData: mockAboutStepRule(),
      defineRuleData: mockDefineStepRule(),
      scheduleRuleData: mockScheduleStepRule(),
    });
    const { queryByTestId } = renderRulePreview();

    await act(async () => {
      expect(queryByTestId(RULE_PREVIEW_ACTIONS_HEADER_TEST_ID)).not.toBeInTheDocument();
      expect(queryByTestId(RULE_PREVIEW_ACTIONS_CONTENT_TEST_ID)).not.toBeInTheDocument();
    });
  });

  it('should render loading spinner when rule is loading', async () => {
    mockUseRuleWithFallback.mockReturnValue({ loading: true, rule: null });
    mockGetStepsData.mockReturnValue({});
    const { getByTestId } = renderRulePreview();
    await act(async () => {
      expect(getByTestId(RULE_PREVIEW_LOADING_TEST_ID)).toBeInTheDocument();
    });
  });

  it('should not render rule preview when rule is null', async () => {
    mockUseRuleWithFallback.mockReturnValue({});
    mockGetStepsData.mockReturnValue({});
    const { queryByTestId, getByText } = renderRulePreview();
    await act(async () => {
      expect(queryByTestId(RULE_PREVIEW_BODY_TEST_ID)).not.toBeInTheDocument();
      expect(getByText(NO_DATA_MESSAGE)).toBeInTheDocument();
    });
  });
});

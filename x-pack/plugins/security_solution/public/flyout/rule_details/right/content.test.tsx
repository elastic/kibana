/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { PanelContent } from './content';
import { ThemeProvider } from 'styled-components';
import { getMockTheme } from '../../../common/lib/kibana/kibana_react.mock';
import { TestProviders } from '../../../common/mock';
import { useRuleDetails } from '../hooks/use_rule_details';
import { getStepsData } from '../../../detections/pages/detection_engine/rules/helpers';
import {
  mockAboutStepRule,
  mockDefineStepRule,
  mockScheduleStepRule,
} from '../../../detection_engine/rule_management_ui/components/rules_table/__mocks__/mock';
import type { RuleResponse } from '../../../../common/api/detection_engine';
import {
  BODY_TEST_ID,
  ABOUT_HEADER_TEST_ID,
  ABOUT_CONTENT_TEST_ID,
  DEFINITION_HEADER_TEST_ID,
  DEFINITION_CONTENT_TEST_ID,
  SCHEDULE_HEADER_TEST_ID,
  SCHEDULE_CONTENT_TEST_ID,
  ACTIONS_HEADER_TEST_ID,
  ACTIONS_CONTENT_TEST_ID,
} from './test_ids';

const mockUseRuleDetails = useRuleDetails as jest.Mock;
jest.mock('../hooks/use_rule_details');

const mockGetStepsData = getStepsData as jest.Mock;
jest.mock('../../../detections/pages/detection_engine/rules/helpers');

const mockTheme = getMockTheme({ eui: { euiColorMediumShade: '#ece' } });
const rule = { name: 'rule name', description: 'rule description' } as RuleResponse;

const renderRulePreview = () =>
  render(
    <TestProviders>
      <ThemeProvider theme={mockTheme}>
        <PanelContent rule={rule} />
      </ThemeProvider>
    </TestProviders>
  );

describe('<RulePreview />', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockUseRuleDetails.mockReturnValue({
      rule,
      loading: false,
      isExistingRule: true,
    });
  });

  it('should render rule preview and its sub sections', () => {
    mockGetStepsData.mockReturnValue({
      aboutRuleData: mockAboutStepRule(),
      defineRuleData: mockDefineStepRule(),
      scheduleRuleData: mockScheduleStepRule(),
      ruleActionsData: { actions: ['action'] },
    });

    const { getByTestId } = renderRulePreview();

    expect(getByTestId(BODY_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(ABOUT_HEADER_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(ABOUT_HEADER_TEST_ID)).toHaveTextContent('About');
    expect(getByTestId(ABOUT_CONTENT_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(DEFINITION_HEADER_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(DEFINITION_HEADER_TEST_ID)).toHaveTextContent('Definition');
    expect(getByTestId(DEFINITION_CONTENT_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(SCHEDULE_HEADER_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(SCHEDULE_HEADER_TEST_ID)).toHaveTextContent('Schedule');
    expect(getByTestId(SCHEDULE_CONTENT_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(ACTIONS_HEADER_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(ACTIONS_HEADER_TEST_ID)).toHaveTextContent('Actions');
    expect(getByTestId(ACTIONS_CONTENT_TEST_ID)).toBeInTheDocument();
  });

  it('should not render actions if action is not available', () => {
    mockGetStepsData.mockReturnValue({
      aboutRuleData: mockAboutStepRule(),
      defineRuleData: mockDefineStepRule(),
      scheduleRuleData: mockScheduleStepRule(),
    });
    const { queryByTestId } = renderRulePreview();

    expect(queryByTestId(ACTIONS_HEADER_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(ACTIONS_CONTENT_TEST_ID)).not.toBeInTheDocument();
  });
});

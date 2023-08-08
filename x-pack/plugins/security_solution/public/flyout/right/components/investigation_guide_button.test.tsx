/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { InvestigationGuideButton } from './investigation_guide_button';
import { RightPanelContext } from '../context';
import { INVESTIGATION_GUIDE_BUTTON_TEST_ID } from './test_ids';
import { mockContextValue } from '../mocks/mock_right_panel_context';
import { mockFlyoutContextValue } from '../../shared/mocks/mock_flyout_context';
import { ExpandableFlyoutContext } from '@kbn/expandable-flyout/src/context';
import { useRuleWithFallback } from '../../../detection_engine/rule_management/logic/use_rule_with_fallback';

const mockUseRuleWithFallback = useRuleWithFallback as jest.Mock;
jest.mock('../../../detection_engine/rule_management/logic/use_rule_with_fallback');

describe('<InvestigationGuideButton />', () => {
  it('should render investigation guide button correctly', () => {
    mockUseRuleWithFallback.mockReturnValue({ rule: { note: 'test note' } });
    const { getByTestId } = render(
      <ExpandableFlyoutContext.Provider value={mockFlyoutContextValue}>
        <RightPanelContext.Provider value={mockContextValue}>
          <InvestigationGuideButton />
        </RightPanelContext.Provider>
      </ExpandableFlyoutContext.Provider>
    );
    expect(getByTestId(INVESTIGATION_GUIDE_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should not render investigation guide button when dataFormattedForFieldBrowser is null', () => {
    const { container } = render(
      <ExpandableFlyoutContext.Provider value={mockFlyoutContextValue}>
        <RightPanelContext.Provider
          value={{ ...mockContextValue, dataFormattedForFieldBrowser: null }}
        >
          <InvestigationGuideButton />
        </RightPanelContext.Provider>
      </ExpandableFlyoutContext.Provider>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should not render investigation guide button when rule id is null', () => {
    const { container } = render(
      <ExpandableFlyoutContext.Provider value={mockFlyoutContextValue}>
        <RightPanelContext.Provider
          value={{
            ...mockContextValue,
            dataFormattedForFieldBrowser: [
              {
                category: 'kibana',
                field: 'kibana.alert.rule.uuid',
                isObjectArray: false,
              },
            ],
          }}
        >
          <InvestigationGuideButton />
        </RightPanelContext.Provider>
      </ExpandableFlyoutContext.Provider>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('should not render investigation guide button when investigation guide is not available', () => {
    mockUseRuleWithFallback.mockReturnValue({ rule: {} });
    const { container } = render(
      <ExpandableFlyoutContext.Provider value={mockFlyoutContextValue}>
        <RightPanelContext.Provider value={mockContextValue}>
          <InvestigationGuideButton />
        </RightPanelContext.Provider>
      </ExpandableFlyoutContext.Provider>
    );
    expect(container).toBeEmptyDOMElement();
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  INVESTIGATION_SECTION_CONTENT_TEST_ID,
  INVESTIGATION_SECTION_HEADER_TEST_ID,
} from './test_ids';
import { RightPanelContext } from '../context';
import { InvestigationSection } from './investigation_section';
import { ExpandableFlyoutContext } from '@kbn/expandable-flyout/src/context';
import { useRuleWithFallback } from '../../../detection_engine/rule_management/logic/use_rule_with_fallback';

const mockUseRuleWithFallback = useRuleWithFallback as jest.Mock;
jest.mock('../../../detection_engine/rule_management/logic/use_rule_with_fallback');

const flyoutContextValue = {} as unknown as ExpandableFlyoutContext;
const panelContextValue = {} as unknown as RightPanelContext;

describe('<InvestigationSection />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRuleWithFallback.mockReturnValue({ rule: { note: 'test note' } });
  });
  it('should render the component collapsed', () => {
    const { getByTestId } = render(
      <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
        <RightPanelContext.Provider value={panelContextValue}>
          <InvestigationSection />
        </RightPanelContext.Provider>
      </ExpandableFlyoutContext.Provider>
    );

    expect(getByTestId(INVESTIGATION_SECTION_HEADER_TEST_ID)).toBeInTheDocument();
  });

  it('should render the component expanded', () => {
    const { getByTestId } = render(
      <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
        <RightPanelContext.Provider value={panelContextValue}>
          <InvestigationSection expanded={true} />
        </RightPanelContext.Provider>
      </ExpandableFlyoutContext.Provider>
    );

    expect(getByTestId(INVESTIGATION_SECTION_HEADER_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(INVESTIGATION_SECTION_CONTENT_TEST_ID)).toBeInTheDocument();
  });

  it('should expand the component when clicking on the arrow on header', () => {
    const { getByTestId } = render(
      <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
        <RightPanelContext.Provider value={panelContextValue}>
          <InvestigationSection />
        </RightPanelContext.Provider>
      </ExpandableFlyoutContext.Provider>
    );

    getByTestId(INVESTIGATION_SECTION_HEADER_TEST_ID).click();
    expect(getByTestId(INVESTIGATION_SECTION_CONTENT_TEST_ID)).toBeInTheDocument();
  });
});

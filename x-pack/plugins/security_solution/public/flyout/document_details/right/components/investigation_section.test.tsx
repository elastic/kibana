/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import {
  INVESTIGATION_SECTION_CONTENT_TEST_ID,
  INVESTIGATION_SECTION_HEADER_TEST_ID,
} from './test_ids';
import { RightPanelContext } from '../context';
import { InvestigationSection } from './investigation_section';
import type { ExpandableFlyoutContextValue } from '@kbn/expandable-flyout/src/context';
import { ExpandableFlyoutContext } from '@kbn/expandable-flyout/src/context';
import { useRuleWithFallback } from '../../../../detection_engine/rule_management/logic/use_rule_with_fallback';
import { mockDataFormattedForFieldBrowser } from '../../shared/mocks/mock_data_formatted_for_field_browser';

jest.mock('../../../../detection_engine/rule_management/logic/use_rule_with_fallback');

const flyoutContextValue = {} as unknown as ExpandableFlyoutContextValue;
const panelContextValue = {
  dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser.filter(
    (d) => d.field !== 'kibana.alert.rule.type'
  ),
} as unknown as RightPanelContext;

const renderInvestigationSection = (expanded: boolean = false) =>
  render(
    <IntlProvider locale="en">
      <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
        <RightPanelContext.Provider value={panelContextValue}>
          <InvestigationSection expanded={expanded} />
        </RightPanelContext.Provider>
      </ExpandableFlyoutContext.Provider>
    </IntlProvider>
  );

describe('<InvestigationSection />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRuleWithFallback as jest.Mock).mockReturnValue({ rule: { note: 'test note' } });
  });
  it('should render the component collapsed', () => {
    const { getByTestId } = renderInvestigationSection();

    expect(getByTestId(INVESTIGATION_SECTION_HEADER_TEST_ID)).toBeInTheDocument();
  });

  it('should render the component expanded', () => {
    const { getByTestId } = renderInvestigationSection(true);

    expect(getByTestId(INVESTIGATION_SECTION_HEADER_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(INVESTIGATION_SECTION_CONTENT_TEST_ID)).toBeInTheDocument();
  });

  it('should expand the component when clicking on the arrow on header', () => {
    const { getByTestId } = renderInvestigationSection();

    getByTestId(INVESTIGATION_SECTION_HEADER_TEST_ID).click();
    expect(getByTestId(INVESTIGATION_SECTION_CONTENT_TEST_ID)).toBeInTheDocument();
  });
});

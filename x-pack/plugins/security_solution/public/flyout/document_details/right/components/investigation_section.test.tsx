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
  INVESTIGATION_GUIDE_TEST_ID,
  HIGHLIGHTED_FIELDS_TITLE_TEST_ID,
} from './test_ids';
import { RightPanelContext } from '../context';
import { InvestigationSection } from './investigation_section';
import { useRuleWithFallback } from '../../../../detection_engine/rule_management/logic/use_rule_with_fallback';
import { mockDataFormattedForFieldBrowser } from '../../shared/mocks/mock_data_formatted_for_field_browser';
import { TestProvider } from '@kbn/expandable-flyout/src/test/provider';
import { mockContextValue } from '../mocks/mock_context';

jest.mock('../../../../detection_engine/rule_management/logic/use_rule_with_fallback');

const panelContextValue = {
  ...mockContextValue,
  dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser.filter(
    (d) => d.field !== 'kibana.alert.rule.type'
  ),
};

const renderInvestigationSection = (expanded: boolean = false, contextValue = panelContextValue) =>
  render(
    <IntlProvider locale="en">
      <TestProvider>
        <RightPanelContext.Provider value={contextValue}>
          <InvestigationSection expanded={expanded} />
        </RightPanelContext.Provider>
      </TestProvider>
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

  it('should render investigation guide and highlighted fields when document is signal', () => {
    const { getByTestId } = renderInvestigationSection(true);
    expect(getByTestId(INVESTIGATION_GUIDE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(HIGHLIGHTED_FIELDS_TITLE_TEST_ID)).toBeInTheDocument();
  });

  it('should not render investigation guide when document is not signal', () => {
    const mockGetFieldsData = (field: string) => {
      switch (field) {
        case 'event.kind':
          return 'alert';
      }
    };
    const { getByTestId, queryByTestId } = renderInvestigationSection(true, {
      ...panelContextValue,
      getFieldsData: mockGetFieldsData,
    });
    expect(queryByTestId(INVESTIGATION_GUIDE_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(HIGHLIGHTED_FIELDS_TITLE_TEST_ID)).toBeInTheDocument();
  });
});

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
import { DocumentDetailsContext } from '../../shared/context';
import { InvestigationSection } from './investigation_section';
import { useRuleWithFallback } from '../../../../detection_engine/rule_management/logic/use_rule_with_fallback';
import { mockDataFormattedForFieldBrowser } from '../../shared/mocks/mock_data_formatted_for_field_browser';
import { TestProvider } from '@kbn/expandable-flyout/src/test/provider';
import { mockContextValue } from '../../shared/mocks/mock_context';
import { useExpandSection } from '../hooks/use_expand_section';
import { useHighlightedFields } from '../../shared/hooks/use_highlighted_fields';

jest.mock('../../../../detection_engine/rule_management/logic/use_rule_with_fallback');
jest.mock('../hooks/use_expand_section');
jest.mock('../../shared/hooks/use_highlighted_fields');

const panelContextValue = {
  ...mockContextValue,
  dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser.filter(
    (d) => d.field !== 'kibana.alert.rule.type'
  ),
};

const renderInvestigationSection = (contextValue = panelContextValue) =>
  render(
    <IntlProvider locale="en">
      <TestProvider>
        <DocumentDetailsContext.Provider value={contextValue}>
          <InvestigationSection />
        </DocumentDetailsContext.Provider>
      </TestProvider>
    </IntlProvider>
  );

describe('<InvestigationSection />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRuleWithFallback as jest.Mock).mockReturnValue({ rule: { note: 'test note' } });
  });

  it('should render investigation component', () => {
    const { getByTestId } = renderInvestigationSection();
    expect(getByTestId(INVESTIGATION_SECTION_HEADER_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(INVESTIGATION_SECTION_HEADER_TEST_ID)).toHaveTextContent('Investigation');
    expect(getByTestId(INVESTIGATION_SECTION_CONTENT_TEST_ID)).toBeInTheDocument();
  });

  it('should render the component collapsed if value is false in local storage', () => {
    (useExpandSection as jest.Mock).mockReturnValue(false);

    const { getByTestId } = renderInvestigationSection();
    expect(getByTestId(INVESTIGATION_SECTION_CONTENT_TEST_ID)).not.toBeVisible();
  });

  it('should render the component expanded if value is true in local storage', () => {
    (useExpandSection as jest.Mock).mockReturnValue(true);
    (useHighlightedFields as jest.Mock).mockReturnValue([]);

    const { getByTestId } = renderInvestigationSection();
    expect(getByTestId(INVESTIGATION_SECTION_CONTENT_TEST_ID)).toBeVisible();
  });

  it('should render investigation guide and highlighted fields when document is signal', () => {
    (useExpandSection as jest.Mock).mockReturnValue(true);
    (useHighlightedFields as jest.Mock).mockReturnValue([]);

    const { getByTestId } = renderInvestigationSection();
    expect(getByTestId(INVESTIGATION_GUIDE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(HIGHLIGHTED_FIELDS_TITLE_TEST_ID)).toBeInTheDocument();
  });

  it('should not render investigation guide when document is not signal', () => {
    (useExpandSection as jest.Mock).mockReturnValue(true);
    (useHighlightedFields as jest.Mock).mockReturnValue([]);

    const mockGetFieldsData = (field: string) => {
      switch (field) {
        case 'event.kind':
          return 'alert';
      }
    };
    const { getByTestId, queryByTestId } = renderInvestigationSection({
      ...panelContextValue,
      getFieldsData: mockGetFieldsData,
    });
    expect(queryByTestId(INVESTIGATION_GUIDE_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(HIGHLIGHTED_FIELDS_TITLE_TEST_ID)).toBeInTheDocument();
  });
});

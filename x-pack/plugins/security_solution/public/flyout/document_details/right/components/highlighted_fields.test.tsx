/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { RightPanelContext } from '../context';
import { HIGHLIGHTED_FIELDS_DETAILS_TEST_ID, HIGHLIGHTED_FIELDS_TITLE_TEST_ID } from './test_ids';
import { HighlightedFields } from './highlighted_fields';
import { mockDataFormattedForFieldBrowser } from '../../shared/mocks/mock_data_formatted_for_field_browser';
import { useHighlightedFields } from '../../shared/hooks/use_highlighted_fields';
import { TestProviders } from '../../../../common/mock';
import { useRuleWithFallback } from '../../../../detection_engine/rule_management/logic/use_rule_with_fallback';

jest.mock('../../shared/hooks/use_highlighted_fields');
jest.mock('../../../../detection_engine/rule_management/logic/use_rule_with_fallback');

const renderHighlightedFields = (contextValue: RightPanelContext) =>
  render(
    <TestProviders>
      <RightPanelContext.Provider value={contextValue}>
        <HighlightedFields />
      </RightPanelContext.Provider>
    </TestProviders>
  );

const NO_DATA_MESSAGE = "There's no highlighted fields for this alert.";

describe('<HighlightedFields />', () => {
  beforeEach(() => {
    (useRuleWithFallback as jest.Mock).mockReturnValue({ investigation_fields: undefined });
  });

  it('should render the component', () => {
    const contextValue = {
      dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
      scopeId: 'scopeId',
    } as unknown as RightPanelContext;
    (useHighlightedFields as jest.Mock).mockReturnValue({
      field: {
        values: ['value'],
      },
    });

    const { getByTestId } = renderHighlightedFields(contextValue);

    expect(getByTestId(HIGHLIGHTED_FIELDS_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(HIGHLIGHTED_FIELDS_DETAILS_TEST_ID)).toBeInTheDocument();
  });

  it(`should render no data message if there aren't any highlighted fields`, () => {
    const contextValue = {
      dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
      scopeId: 'scopeId',
    } as unknown as RightPanelContext;
    (useHighlightedFields as jest.Mock).mockReturnValue({});

    const { getByText } = renderHighlightedFields(contextValue);
    expect(getByText(NO_DATA_MESSAGE)).toBeInTheDocument();
  });
});

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
import { mockDataFormattedForFieldBrowser } from '../mocks/mock_context';
import { useHighlightedFields } from '../hooks/use_highlighted_fields';
import { TestProviders } from '../../../common/mock';
import { useRuleWithFallback } from '../../../detection_engine/rule_management/logic/use_rule_with_fallback';

jest.mock('../hooks/use_highlighted_fields');
jest.mock('../../../detection_engine/rule_management/logic/use_rule_with_fallback');

describe('<HighlightedFields />', () => {
  beforeEach(() => {
    (useRuleWithFallback as jest.Mock).mockReturnValue({ investigation_fields: [] });
  });

  it('should render the component', () => {
    const panelContextValue = {
      dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
    } as unknown as RightPanelContext;
    (useHighlightedFields as jest.Mock).mockReturnValue([
      {
        field: 'field',
        description: {
          field: 'field',
          values: ['value'],
        },
      },
    ]);

    const { getByTestId } = render(
      <TestProviders>
        <RightPanelContext.Provider value={panelContextValue}>
          <HighlightedFields />
        </RightPanelContext.Provider>
      </TestProviders>
    );

    expect(getByTestId(HIGHLIGHTED_FIELDS_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(HIGHLIGHTED_FIELDS_DETAILS_TEST_ID)).toBeInTheDocument();
  });

  it(`should render empty component if there aren't any highlighted fields`, () => {
    const panelContextValue = {
      dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
    } as unknown as RightPanelContext;
    (useHighlightedFields as jest.Mock).mockReturnValue([]);

    const { container } = render(
      <RightPanelContext.Provider value={panelContextValue}>
        <HighlightedFields />
      </RightPanelContext.Provider>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should render empty component if dataFormattedForFieldBrowser is null', () => {
    const panelContextValue = {
      dataFormattedForFieldBrowser: null,
    } as unknown as RightPanelContext;
    (useHighlightedFields as jest.Mock).mockReturnValue([
      {
        field: 'field',
        description: {
          field: 'field',
          values: ['value'],
        },
      },
    ]);

    const { container } = render(
      <RightPanelContext.Provider value={panelContextValue}>
        <HighlightedFields />
      </RightPanelContext.Provider>
    );

    expect(container).toBeEmptyDOMElement();
  });
});

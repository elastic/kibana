/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { RightPanelContext } from '../context';
import { RESPONSE_BUTTON_TEST_ID, RESPONSE_EMPTY_TEST_ID } from './test_ids';
import { mockContextValue } from '../mocks/mock_right_panel_context';
import { mockFlyoutContextValue } from '../../shared/mocks/mock_flyout_context';
import { ExpandableFlyoutContext } from '@kbn/expandable-flyout/src/context';
import { ResponseButton } from './response_button';
import type { SearchHit } from '../../../../common/search_strategy';

const mockValidSearchHit = {
  fields: {
    'kibana.alert.rule.parameters': [
      {
        response_actions: [
          {
            action_type_id: 'action_type_id',
            params: {},
          },
        ],
      },
    ],
  },
} as unknown as SearchHit;

const mockInvalidSearchHit = {
  fields: {},
} as unknown as SearchHit;

describe('<ResponseButton />', () => {
  it('should render response button correctly', () => {
    const { getByTestId } = render(
      <ExpandableFlyoutContext.Provider value={mockFlyoutContextValue}>
        <RightPanelContext.Provider value={{ ...mockContextValue, searchHit: mockValidSearchHit }}>
          <ResponseButton />
        </RightPanelContext.Provider>
      </ExpandableFlyoutContext.Provider>
    );
    expect(getByTestId(RESPONSE_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should not render response button when searchHit is undefined', () => {
    const { getByTestId } = render(
      <ExpandableFlyoutContext.Provider value={mockFlyoutContextValue}>
        <RightPanelContext.Provider value={mockContextValue}>
          <ResponseButton />
        </RightPanelContext.Provider>
      </ExpandableFlyoutContext.Provider>
    );

    expect(getByTestId(RESPONSE_EMPTY_TEST_ID)).toBeInTheDocument();
  });

  it(`should not render investigation guide button when searchHit doesn't have correct data`, () => {
    const { getByTestId } = render(
      <ExpandableFlyoutContext.Provider value={mockFlyoutContextValue}>
        <RightPanelContext.Provider
          value={{ ...mockContextValue, searchHit: mockInvalidSearchHit }}
        >
          <ResponseButton />
        </RightPanelContext.Provider>
      </ExpandableFlyoutContext.Provider>
    );
    expect(getByTestId(RESPONSE_EMPTY_TEST_ID)).toBeInTheDocument();
  });
});

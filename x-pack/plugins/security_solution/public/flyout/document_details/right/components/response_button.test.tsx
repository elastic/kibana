/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import { RightPanelContext } from '../context';
import { RESPONSE_BUTTON_TEST_ID, RESPONSE_EMPTY_TEST_ID } from './test_ids';
import { mockContextValue } from '../mocks/mock_context';
import { ResponseButton } from './response_button';
import type { SearchHit } from '../../../../../common/search_strategy';
import { TestProvider } from '@kbn/expandable-flyout/src/test/provider';

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

const renderResponseButton = (panelContextValue: RightPanelContext = mockContextValue) =>
  render(
    <IntlProvider locale="en">
      <TestProvider>
        <RightPanelContext.Provider value={panelContextValue}>
          <ResponseButton />
        </RightPanelContext.Provider>
      </TestProvider>
    </IntlProvider>
  );
describe('<ResponseButton />', () => {
  it('should render response button correctly', () => {
    const panelContextValue = { ...mockContextValue, searchHit: mockValidSearchHit };
    const { getByTestId, queryByTestId } = renderResponseButton(panelContextValue);
    expect(getByTestId(RESPONSE_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RESPONSE_BUTTON_TEST_ID)).toHaveTextContent('Response');
    expect(queryByTestId(RESPONSE_EMPTY_TEST_ID)).not.toBeInTheDocument();
  });
});

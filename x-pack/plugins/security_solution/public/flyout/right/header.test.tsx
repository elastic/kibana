/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ExpandableFlyoutContext } from '@kbn/expandable-flyout/src/context';
import { TestProviders } from '../../common/mock';
import { RightPanelContext } from './context';
import { mockContextValue } from './mocks/mock_right_panel_context';
import { PanelHeader } from './header';
import {
  COLLAPSE_DETAILS_BUTTON_TEST_ID,
  EXPAND_DETAILS_BUTTON_TEST_ID,
} from './components/test_ids';
import { mockFlyoutContextValue } from '../shared/mocks/mock_flyout_context';

describe('<PanelHeader />', () => {
  it('should render expand details button if flyout is expandable', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ExpandableFlyoutContext.Provider value={mockFlyoutContextValue}>
          <RightPanelContext.Provider value={mockContextValue}>
            <PanelHeader
              flyoutIsExpandable={true}
              selectedTabId={'overview'}
              setSelectedTabId={() => window.alert('test')}
              tabs={[]}
            />
          </RightPanelContext.Provider>
        </ExpandableFlyoutContext.Provider>
      </TestProviders>
    );

    expect(getByTestId(EXPAND_DETAILS_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should not render expand details button if flyout is not expandable', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <ExpandableFlyoutContext.Provider value={mockFlyoutContextValue}>
          <RightPanelContext.Provider value={mockContextValue}>
            <PanelHeader
              flyoutIsExpandable={false}
              selectedTabId={'overview'}
              setSelectedTabId={() => window.alert('test')}
              tabs={[]}
            />
          </RightPanelContext.Provider>
        </ExpandableFlyoutContext.Provider>
      </TestProviders>
    );

    expect(queryByTestId(EXPAND_DETAILS_BUTTON_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(COLLAPSE_DETAILS_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import type { ExpandableFlyoutContextValue } from '@kbn/expandable-flyout/src/context';
import { ExpandableFlyoutContext } from '@kbn/expandable-flyout/src/context';
import { TestProviders } from '../../../common/mock';
import { FlyoutNavigation } from './flyout_navigation';
import {
  COLLAPSE_DETAILS_BUTTON_TEST_ID,
  EXPAND_DETAILS_BUTTON_TEST_ID,
  HEADER_ACTIONS_TEST_ID,
} from './test_ids';
import { mockFlyoutContextValue } from '../../document_details/shared/mocks/mock_flyout_context';

const expandDetails = jest.fn();

describe('<FlyoutNavigation />', () => {
  describe('when flyout is expandable', () => {
    it('should render expand button', () => {
      const flyoutContextValue = {
        panels: {},
      } as unknown as ExpandableFlyoutContextValue;

      const { getByTestId, queryByTestId } = render(
        <TestProviders>
          <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
            <FlyoutNavigation flyoutIsExpandable={true} expandDetails={expandDetails} />
          </ExpandableFlyoutContext.Provider>
        </TestProviders>
      );
      expect(getByTestId(EXPAND_DETAILS_BUTTON_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(EXPAND_DETAILS_BUTTON_TEST_ID)).toHaveTextContent('Expand details');
      expect(queryByTestId(COLLAPSE_DETAILS_BUTTON_TEST_ID)).not.toBeInTheDocument();

      getByTestId(EXPAND_DETAILS_BUTTON_TEST_ID).click();
      expect(expandDetails).toHaveBeenCalled();
    });

    it('should render collapse button', () => {
      const flyoutContextValue = {
        closeLeftPanel: jest.fn(),
        panels: {
          left: {},
        },
      } as unknown as ExpandableFlyoutContextValue;

      const { getByTestId, queryByTestId } = render(
        <TestProviders>
          <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
            <FlyoutNavigation flyoutIsExpandable={true} expandDetails={expandDetails} />
          </ExpandableFlyoutContext.Provider>
        </TestProviders>
      );

      expect(getByTestId(COLLAPSE_DETAILS_BUTTON_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(COLLAPSE_DETAILS_BUTTON_TEST_ID)).toHaveTextContent('Collapse details');
      expect(queryByTestId(EXPAND_DETAILS_BUTTON_TEST_ID)).not.toBeInTheDocument();

      getByTestId(COLLAPSE_DETAILS_BUTTON_TEST_ID).click();
      expect(flyoutContextValue.closeLeftPanel).toHaveBeenCalled();
    });
  });

  it('should not render expand details button if flyout is not expandable', () => {
    const { queryByTestId, getByTestId } = render(
      <TestProviders>
        <ExpandableFlyoutContext.Provider value={mockFlyoutContextValue}>
          <FlyoutNavigation flyoutIsExpandable={false} actions={<div />} />
        </ExpandableFlyoutContext.Provider>
      </TestProviders>
    );
    expect(getByTestId(HEADER_ACTIONS_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(EXPAND_DETAILS_BUTTON_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(COLLAPSE_DETAILS_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render actions if there are actions available', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ExpandableFlyoutContext.Provider value={mockFlyoutContextValue}>
          <FlyoutNavigation
            flyoutIsExpandable={true}
            expandDetails={expandDetails}
            actions={<div />}
          />
        </ExpandableFlyoutContext.Provider>
      </TestProviders>
    );
    expect(getByTestId(EXPAND_DETAILS_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(HEADER_ACTIONS_TEST_ID)).toBeInTheDocument();
  });

  it('should render empty component if panel is not expandable and no action is available', async () => {
    const { container } = render(
      <TestProviders>
        <ExpandableFlyoutContext.Provider value={mockFlyoutContextValue}>
          <FlyoutNavigation flyoutIsExpandable={false} />
        </ExpandableFlyoutContext.Provider>
      </TestProviders>
    );
    await act(async () => {
      expect(container).toBeEmptyDOMElement();
    });
  });
});

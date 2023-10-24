/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import { ExpandDetailButton } from './expand_detail_button';
import { COLLAPSE_DETAILS_BUTTON_TEST_ID, EXPAND_DETAILS_BUTTON_TEST_ID } from './test_ids';
import { ExpandableFlyoutContext } from '@kbn/expandable-flyout/src/context';

const expandDetails = jest.fn();

const renderExpandDetailButton = (flyoutContextValue: ExpandableFlyoutContext) =>
  render(
    <IntlProvider locale="en">
      <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
        <ExpandDetailButton expandDetails={expandDetails} />
      </ExpandableFlyoutContext.Provider>
    </IntlProvider>
  );

describe('<ExpandDetailButton />', () => {
  it('should render expand button', () => {
    const flyoutContextValue = {
      panels: {},
    } as unknown as ExpandableFlyoutContext;

    const { getByTestId, queryByTestId } = renderExpandDetailButton(flyoutContextValue);

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
    } as unknown as ExpandableFlyoutContext;

    const { getByTestId, queryByTestId } = renderExpandDetailButton(flyoutContextValue);

    expect(getByTestId(COLLAPSE_DETAILS_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(COLLAPSE_DETAILS_BUTTON_TEST_ID)).toHaveTextContent('Collapse details');
    expect(queryByTestId(EXPAND_DETAILS_BUTTON_TEST_ID)).not.toBeInTheDocument();

    getByTestId(COLLAPSE_DETAILS_BUTTON_TEST_ID).click();
    expect(flyoutContextValue.closeLeftPanel).toHaveBeenCalled();
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { PreviewPanelContext } from '../context';
import { mockContextValue } from '../mocks/mock_context';
import { ALERT_REASON_PREVIEW_BODY_TEST_ID } from './test_ids';
import { AlertReasonPreview } from './alert_reason_preview';
import { TestProviders } from '../../../../common/mock';

const panelContextValue = {
  ...mockContextValue,
};

const NO_DATA_MESSAGE = 'There was an error displaying data.';

describe('<AlertReasonPreview />', () => {
  it('should render alert reason preview', () => {
    const { getByTestId } = render(
      <PreviewPanelContext.Provider value={panelContextValue}>
        <AlertReasonPreview />
      </PreviewPanelContext.Provider>,
      { wrapper: TestProviders }
    );
    expect(getByTestId(ALERT_REASON_PREVIEW_BODY_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(ALERT_REASON_PREVIEW_BODY_TEST_ID)).toHaveTextContent('Alert reason');
  });

  it('should render no data message if alert reason is not available', () => {
    const { getByText } = render(
      <PreviewPanelContext.Provider value={{} as unknown as PreviewPanelContext}>
        <AlertReasonPreview />
      </PreviewPanelContext.Provider>,
      { wrapper: TestProviders }
    );
    expect(getByText(NO_DATA_MESSAGE)).toBeInTheDocument();
  });
});

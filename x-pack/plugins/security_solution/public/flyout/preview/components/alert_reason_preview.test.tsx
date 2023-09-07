/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { PreviewPanelContext } from '../context';
import { mockContextValue } from '../mocks/mock_preview_panel_context';
import { ALERT_REASON_PREVIEW_BODY_TEST_ID } from './test_ids';
import { AlertReasonPreview } from './alert_reason_preview';
import { ThemeProvider } from 'styled-components';
import { getMockTheme } from '../../../common/lib/kibana/kibana_react.mock';

const mockTheme = getMockTheme({ eui: { euiFontSizeXS: '' } });

const panelContextValue = {
  ...mockContextValue,
};

describe('<AlertReasonPreview />', () => {
  it('should render alert reason preview', () => {
    const { getByTestId } = render(
      <PreviewPanelContext.Provider value={panelContextValue}>
        <ThemeProvider theme={mockTheme}>
          <AlertReasonPreview />
        </ThemeProvider>
      </PreviewPanelContext.Provider>
    );
    expect(getByTestId(ALERT_REASON_PREVIEW_BODY_TEST_ID)).toBeInTheDocument();
  });

  it('should render null is dataAsNestedObject is null', () => {
    const contextValue = {
      ...mockContextValue,
      dataAsNestedObject: null,
    };
    const { queryByTestId } = render(
      <PreviewPanelContext.Provider value={contextValue}>
        <AlertReasonPreview />
      </PreviewPanelContext.Provider>
    );
    expect(queryByTestId(ALERT_REASON_PREVIEW_BODY_TEST_ID)).not.toBeInTheDocument();
  });
});

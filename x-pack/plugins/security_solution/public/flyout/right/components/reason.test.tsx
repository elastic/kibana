/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { REASON_TITLE_TEST_ID } from './test_ids';
import { Reason } from './reason';
import { RightPanelContext } from '../context';
import { mockDataAsNestedObject, mockDataFormattedForFieldBrowser } from '../mocks/mock_context';
import { euiDarkVars } from '@kbn/ui-theme';
import { ThemeProvider } from 'styled-components';

describe('<Reason />', () => {
  it('should render the component', () => {
    const panelContextValue = {
      dataAsNestedObject: mockDataAsNestedObject,
      dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
    } as unknown as RightPanelContext;

    const { getByTestId } = render(
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <RightPanelContext.Provider value={panelContextValue}>
          <Reason />
        </RightPanelContext.Provider>
      </ThemeProvider>
    );

    expect(getByTestId(REASON_TITLE_TEST_ID)).toBeInTheDocument();
  });

  it('should render null if dataFormattedForFieldBrowser is null', () => {
    const panelContextValue = {
      dataAsNestedObject: {},
    } as unknown as RightPanelContext;

    const { container } = render(
      <RightPanelContext.Provider value={panelContextValue}>
        <Reason />
      </RightPanelContext.Provider>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should render null if dataAsNestedObject is null', () => {
    const panelContextValue = {
      dataFormattedForFieldBrowser: [],
    } as unknown as RightPanelContext;

    const { container } = render(
      <RightPanelContext.Provider value={panelContextValue}>
        <Reason />
      </RightPanelContext.Provider>
    );

    expect(container).toBeEmptyDOMElement();
  });
  it('should render null if renderer is null', () => {
    const panelContextValue = {
      dataAsNestedObject: {},
      dataFormattedForFieldBrowser: [],
    } as unknown as RightPanelContext;

    const { container } = render(
      <RightPanelContext.Provider value={panelContextValue}>
        <Reason />
      </RightPanelContext.Provider>
    );

    expect(container).toBeEmptyDOMElement();
  });
});

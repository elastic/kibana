/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { RightPanelContext } from '../context';
import {
  HIGHLIGHTED_FIELDS_DETAILS_TEST_ID,
  HIGHLIGHTED_FIELDS_GO_TO_TABLE_LINK,
  HIGHLIGHTED_FIELDS_HEADER_EXPAND_ICON_TEST_ID,
  HIGHLIGHTED_FIELDS_HEADER_TITLE_TEST_ID,
} from './test_ids';
import { ExpandableFlyoutContext } from '@kbn/expandable-flyout/src/context';
import { HighlightedFields } from './highlighted_fields';
import { RightPanelKey, RightPanelTableTabPath } from '..';
import { getMockTheme } from '../../../common/lib/kibana/kibana_react.mock';
import { ThemeProvider } from 'styled-components';

const mockTheme = getMockTheme({
  eui: {
    euiSizeL: '10px',
  },
});

describe('<HighlightedFields />', () => {
  it('should render the component collapsed', () => {
    const flyoutContextValue = {
      openRightPanel: jest.fn(),
    } as unknown as ExpandableFlyoutContext;
    const panelContextValue = {
      eventId: 'eventId',
      indexName: 'indexName',
      dataFormattedForFieldBrowser: [],
      browserFields: {},
    } as unknown as RightPanelContext;

    const { getByTestId } = render(
      <ThemeProvider theme={mockTheme}>
        <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
          <RightPanelContext.Provider value={panelContextValue}>
            <HighlightedFields />
          </RightPanelContext.Provider>
        </ExpandableFlyoutContext.Provider>
      </ThemeProvider>
    );

    expect(getByTestId(HIGHLIGHTED_FIELDS_HEADER_TITLE_TEST_ID)).toBeInTheDocument();
  });

  it('should render the component expanded', () => {
    const flyoutContextValue = {
      openRightPanel: jest.fn(),
    } as unknown as ExpandableFlyoutContext;
    const panelContextValue = {
      eventId: 'eventId',
      indexName: 'indexName',
      dataFormattedForFieldBrowser: [],
      browserFields: {},
    } as unknown as RightPanelContext;

    const { getByTestId } = render(
      <ThemeProvider theme={mockTheme}>
        <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
          <RightPanelContext.Provider value={panelContextValue}>
            <HighlightedFields expanded={true} />
          </RightPanelContext.Provider>
        </ExpandableFlyoutContext.Provider>
      </ThemeProvider>
    );

    expect(getByTestId(HIGHLIGHTED_FIELDS_HEADER_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(HIGHLIGHTED_FIELDS_DETAILS_TEST_ID)).toBeInTheDocument();
  });

  it('should expand details when clicking on header', () => {
    const flyoutContextValue = {
      openRightPanel: jest.fn(),
    } as unknown as ExpandableFlyoutContext;
    const panelContextValue = {
      eventId: 'eventId',
      indexName: 'indexName',
      dataFormattedForFieldBrowser: [],
      browserFields: {},
    } as unknown as RightPanelContext;

    const { getByTestId } = render(
      <ThemeProvider theme={mockTheme}>
        <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
          <RightPanelContext.Provider value={panelContextValue}>
            <HighlightedFields />
          </RightPanelContext.Provider>
        </ExpandableFlyoutContext.Provider>
      </ThemeProvider>
    );

    getByTestId(HIGHLIGHTED_FIELDS_HEADER_EXPAND_ICON_TEST_ID).click();
    getByTestId(HIGHLIGHTED_FIELDS_GO_TO_TABLE_LINK).click();
    expect(flyoutContextValue.openRightPanel).toHaveBeenCalledWith({
      id: RightPanelKey,
      path: RightPanelTableTabPath,
      params: {
        id: panelContextValue.eventId,
        indexName: panelContextValue.indexName,
      },
    });
    expect(getByTestId(HIGHLIGHTED_FIELDS_DETAILS_TEST_ID)).toBeInTheDocument();
  });

  it('should render empty component if dataFormattedForFieldBrowser is null', () => {
    const flyoutContextValue = {} as unknown as ExpandableFlyoutContext;
    const panelContextValue = {
      eventId: 'eventId',
      indexName: 'indexName',
      dataFormattedForFieldBrowser: null,
      browserFields: {},
    } as unknown as RightPanelContext;

    const { baseElement } = render(
      <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
        <RightPanelContext.Provider value={panelContextValue}>
          <HighlightedFields />
        </RightPanelContext.Provider>
      </ExpandableFlyoutContext.Provider>
    );

    expect(baseElement).toMatchInlineSnapshot(`
      <body>
        <div />
      </body>
    `);
  });

  it('should render empty component if browserFields is null', () => {
    const flyoutContextValue = {} as unknown as ExpandableFlyoutContext;
    const panelContextValue = {
      eventId: 'eventId',
      indexName: 'indexName',
      dataFormattedForFieldBrowser: [],
      browserFields: null,
    } as unknown as RightPanelContext;

    const { baseElement } = render(
      <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
        <RightPanelContext.Provider value={panelContextValue}>
          <HighlightedFields />
        </RightPanelContext.Provider>
      </ExpandableFlyoutContext.Provider>
    );

    expect(baseElement).toMatchInlineSnapshot(`
      <body>
        <div />
      </body>
    `);
  });

  it('should render empty component if eventId is null', () => {
    const flyoutContextValue = {} as unknown as ExpandableFlyoutContext;
    const panelContextValue = {
      eventId: null,
      indexName: 'indexName',
      dataFormattedForFieldBrowser: [],
      browserFields: {},
    } as unknown as RightPanelContext;

    const { baseElement } = render(
      <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
        <RightPanelContext.Provider value={panelContextValue}>
          <HighlightedFields />
        </RightPanelContext.Provider>
      </ExpandableFlyoutContext.Provider>
    );

    expect(baseElement).toMatchInlineSnapshot(`
      <body>
        <div />
      </body>
    `);
  });
});

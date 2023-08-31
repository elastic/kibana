/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  REASON_DETAILS_PREVIEW_BUTTON_TEST_ID,
  REASON_DETAILS_TEST_ID,
  REASON_TITLE_TEST_ID,
} from './test_ids';
import { Reason } from './reason';
import { RightPanelContext } from '../context';
import { mockDataFormattedForFieldBrowser, mockGetFieldsData } from '../mocks/mock_context';
import { ExpandableFlyoutContext } from '@kbn/expandable-flyout/src/context';
import { PreviewPanelKey } from '../../preview';
import { PREVIEW_ALERT_REASON_DETAILS } from './translations';

const flyoutContextValue = {
  openPreviewPanel: jest.fn(),
} as unknown as ExpandableFlyoutContext;

const panelContextValue = {
  eventId: 'event id',
  indexName: 'indexName',
  scopeId: 'scopeId',
  dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
  getFieldsData: mockGetFieldsData,
} as unknown as RightPanelContext;

const renderReason = (panelContext: RightPanelContext = panelContextValue) =>
  render(
    <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
      <RightPanelContext.Provider value={panelContext}>
        <Reason />
      </RightPanelContext.Provider>
    </ExpandableFlyoutContext.Provider>
  );

describe('<Reason />', () => {
  it('should render the component', () => {
    const { getByTestId } = renderReason();
    expect(getByTestId(REASON_TITLE_TEST_ID)).toBeInTheDocument();
  });

  it('should render null if dataFormattedForFieldBrowser is null', () => {
    const panelContext = {
      ...panelContextValue,
      dataFormattedForFieldBrowser: null,
    } as unknown as RightPanelContext;

    const { container } = renderReason(panelContext);

    expect(container).toBeEmptyDOMElement();
  });

  it('should render no reason if the field is null', () => {
    const panelContext = {
      ...panelContextValue,
      getFieldsData: () => {},
    } as unknown as RightPanelContext;

    const { getByTestId } = renderReason(panelContext);

    expect(getByTestId(REASON_DETAILS_TEST_ID)).toBeEmptyDOMElement();
  });

  it('should open preview panel when clicking on button', () => {
    const { getByTestId } = renderReason();

    getByTestId(REASON_DETAILS_PREVIEW_BUTTON_TEST_ID).click();

    expect(flyoutContextValue.openPreviewPanel).toHaveBeenCalledWith({
      id: PreviewPanelKey,
      path: { tab: 'alert-reason-preview' },
      params: {
        id: panelContextValue.eventId,
        indexName: panelContextValue.indexName,
        scopeId: panelContextValue.scopeId,
        banner: {
          title: PREVIEW_ALERT_REASON_DETAILS,
          backgroundColor: 'warning',
          textColor: 'warning',
        },
      },
    });
  });
});

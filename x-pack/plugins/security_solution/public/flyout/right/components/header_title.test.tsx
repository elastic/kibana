/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ExpandableFlyoutContext } from '@kbn/expandable-flyout/src/context';
import { RightPanelContext } from '../context';
import {
  FLYOUT_HEADER_CHAT_BUTTON_TEST_ID,
  FLYOUT_HEADER_RISK_SCORE_VALUE_TEST_ID,
  FLYOUT_HEADER_SEVERITY_TITLE_TEST_ID,
  FLYOUT_HEADER_SHARE_BUTTON_TEST_ID,
  FLYOUT_HEADER_TITLE_TEST_ID,
} from './test_ids';
import { HeaderTitle } from './header_title';
import { EVENT_DETAILS } from './translations';
import moment from 'moment-timezone';
import { useDateFormat, useTimeZone } from '../../../common/lib/kibana';
import { mockDataFormattedForFieldBrowser, mockGetFieldsData } from '../mocks/mock_context';
import { useAssistant } from '../hooks/use_assistant';
import { TestProvidersComponent } from '../../../common/mock';
import { useGetAlertDetailsFlyoutLink } from '../../../timelines/components/side_panel/event_details/use_get_alert_details_flyout_link';

jest.mock('../../../common/lib/kibana');
jest.mock('../hooks/use_assistant');
jest.mock(
  '../../../timelines/components/side_panel/event_details/use_get_alert_details_flyout_link'
);

moment.suppressDeprecationWarnings = true;
moment.tz.setDefault('UTC');

const dateFormat = 'MMM D, YYYY @ HH:mm:ss.SSS';
const flyoutContextValue = {} as unknown as ExpandableFlyoutContext;
const mockContextValue = {
  dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
  getFieldsData: jest.fn().mockImplementation(mockGetFieldsData),
} as unknown as RightPanelContext;

const renderHeader = (contextValue: RightPanelContext) =>
  render(
    <TestProvidersComponent>
      <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
        <RightPanelContext.Provider value={contextValue}>
          <HeaderTitle flyoutIsExpandable={true} />
        </RightPanelContext.Provider>
      </ExpandableFlyoutContext.Provider>
    </TestProvidersComponent>
  );

describe('<HeaderTitle />', () => {
  beforeEach(() => {
    jest.mocked(useDateFormat).mockImplementation(() => dateFormat);
    jest.mocked(useTimeZone).mockImplementation(() => 'UTC');
    jest.mocked(useAssistant).mockReturnValue({ showAssistant: true, promptContextId: '' });
    jest.mocked(useGetAlertDetailsFlyoutLink).mockReturnValue('url');
  });

  it('should render component', () => {
    const { getByTestId } = renderHeader(mockContextValue);

    expect(getByTestId(FLYOUT_HEADER_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(FLYOUT_HEADER_RISK_SCORE_VALUE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(FLYOUT_HEADER_SEVERITY_TITLE_TEST_ID)).toBeInTheDocument();
  });

  it('should render rule name in the title if document is an alert', () => {
    const { getByTestId } = renderHeader(mockContextValue);

    expect(getByTestId(FLYOUT_HEADER_TITLE_TEST_ID)).toHaveTextContent('rule-name');
  });

  it('should render share button in the title', () => {
    const { getByTestId } = renderHeader(mockContextValue);

    expect(getByTestId(FLYOUT_HEADER_SHARE_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should not render share button in the title if alert is missing url info', () => {
    jest.mocked(useGetAlertDetailsFlyoutLink).mockReturnValue(null);

    const { queryByTestId } = renderHeader(mockContextValue);

    expect(queryByTestId(FLYOUT_HEADER_SHARE_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render chat button in the title', () => {
    const { getByTestId } = renderHeader(mockContextValue);

    expect(getByTestId(FLYOUT_HEADER_CHAT_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should not render chat button in the title if should not be shown', () => {
    jest.mocked(useAssistant).mockReturnValue({ showAssistant: false, promptContextId: '' });

    const { queryByTestId } = renderHeader(mockContextValue);

    expect(queryByTestId(FLYOUT_HEADER_CHAT_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render default document detail title if document is not an alert', () => {
    const contextValue = {
      ...mockContextValue,
      dataFormattedForFieldBrowser: [
        {
          category: 'kibana',
          field: 'kibana.alert.rule.name',
          values: [],
          originalValue: [],
          isObjectArray: false,
        },
      ],
    } as unknown as RightPanelContext;

    const { getByTestId } = renderHeader(contextValue);

    expect(getByTestId(FLYOUT_HEADER_TITLE_TEST_ID)).toHaveTextContent(EVENT_DETAILS);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import type { ExpandableFlyoutContextValue } from '@kbn/expandable-flyout/src/context';
import { ExpandableFlyoutContext } from '@kbn/expandable-flyout/src/context';
import { copyToClipboard } from '@elastic/eui';
import { RightPanelContext } from '../context';
import { SHARE_BUTTON_TEST_ID, CHAT_BUTTON_TEST_ID } from './test_ids';
import { HeaderActions } from './header_actions';
import { useAssistant } from '../hooks/use_assistant';
import { mockGetFieldsData } from '../../shared/mocks/mock_get_fields_data';
import { mockDataFormattedForFieldBrowser } from '../../shared/mocks/mock_data_formatted_for_field_browser';
import { TestProvidersComponent } from '../../../../common/mock';
import { useGetAlertDetailsFlyoutLink } from '../../../../timelines/components/side_panel/event_details/use_get_alert_details_flyout_link';
import { URL_PARAM_KEY } from '../../../../common/hooks/use_url_state';

jest.mock('../../../../common/lib/kibana');
jest.mock('../hooks/use_assistant');
jest.mock(
  '../../../../timelines/components/side_panel/event_details/use_get_alert_details_flyout_link'
);

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  copyToClipboard: jest.fn(),
  EuiCopy: jest.fn(({ children: functionAsChild }) => functionAsChild(jest.fn())),
}));

const alertUrl = 'https://example.com/alert';
const flyoutContextValue = {} as unknown as ExpandableFlyoutContextValue;
const mockContextValue = {
  dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
  getFieldsData: jest.fn().mockImplementation(mockGetFieldsData),
} as unknown as RightPanelContext;

const renderHeaderActions = (contextValue: RightPanelContext) =>
  render(
    <TestProvidersComponent>
      <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
        <RightPanelContext.Provider value={contextValue}>
          <HeaderActions />
        </RightPanelContext.Provider>
      </ExpandableFlyoutContext.Provider>
    </TestProvidersComponent>
  );

describe('<HeaderAction />', () => {
  beforeEach(() => {
    jest.mocked(useGetAlertDetailsFlyoutLink).mockReturnValue(alertUrl);
    jest.mocked(useAssistant).mockReturnValue({ showAssistant: true, promptContextId: '' });
  });

  describe('Share alert url action', () => {
    it('should render share button in the title and copy the the value to clipboard if document is an alert', () => {
      const syncedFlyoutState = 'flyoutState';
      const query = `?${URL_PARAM_KEY.eventFlyout}=${syncedFlyoutState}`;

      Object.defineProperty(window, 'location', {
        value: {
          search: query,
        },
      });

      const { getByTestId } = renderHeaderActions(mockContextValue);
      const shareButton = getByTestId(SHARE_BUTTON_TEST_ID);
      expect(shareButton).toBeInTheDocument();

      fireEvent.click(shareButton);

      expect(copyToClipboard).toHaveBeenCalledWith(
        `${alertUrl}&${URL_PARAM_KEY.eventFlyout}=${syncedFlyoutState}`
      );
    });

    it('should not render share button in the title if alert is missing url info', () => {
      jest.mocked(useGetAlertDetailsFlyoutLink).mockReturnValue(null);
      const { queryByTestId } = renderHeaderActions(mockContextValue);
      expect(queryByTestId(SHARE_BUTTON_TEST_ID)).not.toBeInTheDocument();
    });

    it('should not render share button in the title if document is not an alert', () => {
      const { queryByTestId } = renderHeaderActions({
        ...mockContextValue,
        dataFormattedForFieldBrowser: [],
      });
      expect(queryByTestId(SHARE_BUTTON_TEST_ID)).not.toBeInTheDocument();
    });

    it('should render chat button in the title', () => {
      const { getByTestId } = renderHeaderActions(mockContextValue);

      expect(getByTestId(CHAT_BUTTON_TEST_ID)).toBeInTheDocument();
    });

    it('should not render chat button in the title if should not be shown', () => {
      jest.mocked(useAssistant).mockReturnValue({ showAssistant: false, promptContextId: '' });

      const { queryByTestId } = renderHeaderActions(mockContextValue);

      expect(queryByTestId(CHAT_BUTTON_TEST_ID)).not.toBeInTheDocument();
    });
  });
});

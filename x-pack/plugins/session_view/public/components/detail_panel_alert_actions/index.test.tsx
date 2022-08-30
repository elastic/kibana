/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import {
  DetailPanelAlertActions,
  BUTTON_TEST_ID,
  SHOW_DETAILS_TEST_ID,
  JUMP_TO_PROCESS_TEST_ID,
} from '.';
import { mockAlerts } from '../../../common/mocks/constants/session_view_process.mock';
import { ProcessEvent } from '../../../common/types/process_tree';

describe('DetailPanelAlertActions component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;
  let mockShowAlertDetails = jest.fn((uuid) => uuid);
  let mockOnJumpToEvent = jest.fn((event: ProcessEvent) => event);

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    mockShowAlertDetails = jest.fn((uuid) => uuid);
    mockOnJumpToEvent = jest.fn((process) => process);
  });

  describe('When DetailPanelAlertActions is mounted', () => {
    it('renders a popover when button is clicked', async () => {
      const mockEvent = mockAlerts[0];

      renderResult = mockedContext.render(
        <DetailPanelAlertActions
          event={mockEvent}
          onJumpToEvent={mockOnJumpToEvent}
          onShowAlertDetails={mockShowAlertDetails}
        />
      );

      userEvent.click(renderResult.getByTestId(BUTTON_TEST_ID));
      expect(renderResult.queryByTestId(SHOW_DETAILS_TEST_ID)).toBeTruthy();
      expect(renderResult.queryByTestId(JUMP_TO_PROCESS_TEST_ID)).toBeTruthy();
      expect(mockShowAlertDetails.mock.calls.length).toBe(0);
      expect(mockOnJumpToEvent.mock.calls.length).toBe(0);
    });

    it('calls alert flyout callback when View details clicked', async () => {
      const mockEvent = mockAlerts[0];

      renderResult = mockedContext.render(
        <DetailPanelAlertActions
          event={mockEvent}
          onJumpToEvent={mockOnJumpToEvent}
          onShowAlertDetails={mockShowAlertDetails}
        />
      );

      userEvent.click(renderResult.getByTestId(BUTTON_TEST_ID));
      await waitForEuiPopoverOpen();
      userEvent.click(renderResult.getByTestId(SHOW_DETAILS_TEST_ID));
      expect(mockShowAlertDetails.mock.calls.length).toBe(1);
      expect(mockShowAlertDetails.mock.results[0].value).toBe(mockEvent.kibana?.alert?.uuid);
      expect(mockOnJumpToEvent.mock.calls.length).toBe(0);
    });

    it('calls onJumpToEvent when Jump to process clicked', async () => {
      const mockEvent = mockAlerts[0];

      renderResult = mockedContext.render(
        <DetailPanelAlertActions
          event={mockEvent}
          onJumpToEvent={mockOnJumpToEvent}
          onShowAlertDetails={mockShowAlertDetails}
        />
      );

      userEvent.click(renderResult.getByTestId(BUTTON_TEST_ID));
      await waitForEuiPopoverOpen();
      userEvent.click(renderResult.getByTestId(JUMP_TO_PROCESS_TEST_ID));
      expect(mockOnJumpToEvent.mock.calls.length).toBe(1);
      expect(mockOnJumpToEvent.mock.results[0].value).toEqual(mockEvent);
      expect(mockShowAlertDetails.mock.calls.length).toBe(0);
    });
  });
});

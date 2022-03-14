/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import {
  DetailPanelAlertActions,
  BUTTON_TEST_ID,
  SHOW_DETAILS_TEST_ID,
  JUMP_TO_PROCESS_TEST_ID,
} from './index';
import { mockAlerts } from '../../../common/mocks/constants/session_view_process.mock';
import userEvent from '@testing-library/user-event';
import { ProcessImpl } from '../process_tree/hooks';

describe('DetailPanelAlertActions component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;
  let mockShowAlertDetails = jest.fn((uuid) => uuid);
  let mockOnProcessSelected = jest.fn((process) => process);

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    mockShowAlertDetails = jest.fn((uuid) => uuid);
    mockOnProcessSelected = jest.fn((process) => process);
  });

  describe('When DetailPanelAlertActions is mounted', () => {
    it('renders a popover when button is clicked', async () => {
      const mockEvent = mockAlerts[0];

      renderResult = mockedContext.render(
        <DetailPanelAlertActions
          event={mockEvent}
          onProcessSelected={mockOnProcessSelected}
          onShowAlertDetails={mockShowAlertDetails}
        />
      );

      userEvent.click(renderResult.getByTestId(BUTTON_TEST_ID));
      expect(renderResult.queryByTestId(SHOW_DETAILS_TEST_ID)).toBeTruthy();
      expect(renderResult.queryByTestId(JUMP_TO_PROCESS_TEST_ID)).toBeTruthy();
      expect(mockShowAlertDetails.mock.calls.length).toBe(0);
      expect(mockOnProcessSelected.mock.calls.length).toBe(0);
    });

    it('calls alert flyout callback when View details clicked', async () => {
      const mockEvent = mockAlerts[0];

      renderResult = mockedContext.render(
        <DetailPanelAlertActions
          event={mockEvent}
          onProcessSelected={mockOnProcessSelected}
          onShowAlertDetails={mockShowAlertDetails}
        />
      );

      userEvent.click(renderResult.getByTestId(BUTTON_TEST_ID));
      userEvent.click(renderResult.getByTestId(SHOW_DETAILS_TEST_ID));
      expect(mockShowAlertDetails.mock.calls.length).toBe(1);
      expect(mockShowAlertDetails.mock.results[0].value).toBe(mockEvent.kibana?.alert.uuid);
      expect(mockOnProcessSelected.mock.calls.length).toBe(0);
    });

    it('calls onProcessSelected when Jump to process clicked', async () => {
      const mockEvent = mockAlerts[0];

      renderResult = mockedContext.render(
        <DetailPanelAlertActions
          event={mockEvent}
          onProcessSelected={mockOnProcessSelected}
          onShowAlertDetails={mockShowAlertDetails}
        />
      );

      userEvent.click(renderResult.getByTestId(BUTTON_TEST_ID));
      userEvent.click(renderResult.getByTestId(JUMP_TO_PROCESS_TEST_ID));
      expect(mockOnProcessSelected.mock.calls.length).toBe(1);
      expect(mockOnProcessSelected.mock.results[0].value).toBeInstanceOf(ProcessImpl);
      expect(mockShowAlertDetails.mock.calls.length).toBe(0);
    });
  });
});

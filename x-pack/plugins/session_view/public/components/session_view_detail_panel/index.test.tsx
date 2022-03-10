/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  mockAlerts,
  sessionViewBasicProcessMock,
} from '../../../common/mocks/constants/session_view_process.mock';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import { SessionViewDetailPanel } from './index';

describe('SessionView component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;
  let mockOnProcessSelected = jest.fn((process) => process);
  let mockShowAlertDetails = jest.fn((alertId) => alertId);

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    mockOnProcessSelected = jest.fn((process) => process);
    mockShowAlertDetails = jest.fn((alertId) => alertId);
  });

  describe('When SessionViewDetailPanel is mounted', () => {
    it('shows process detail by default', async () => {
      renderResult = mockedContext.render(
        <SessionViewDetailPanel
          selectedProcess={sessionViewBasicProcessMock}
          onProcessSelected={mockOnProcessSelected}
          onShowAlertDetails={mockShowAlertDetails}
        />
      );
      expect(renderResult.queryByText('8e4daeb2-4a4e-56c4-980e-f0dcfdbc3726')).toBeVisible();
    });

    it('can switch tabs to show host details', async () => {
      renderResult = mockedContext.render(
        <SessionViewDetailPanel
          selectedProcess={sessionViewBasicProcessMock}
          onProcessSelected={mockOnProcessSelected}
          onShowAlertDetails={mockShowAlertDetails}
        />
      );

      renderResult.queryByText('Host')?.click();
      expect(renderResult.queryByText('hostname')).toBeVisible();
      expect(renderResult.queryAllByText('james-fleet-714-2')).toHaveLength(2);
    });

    it('can switch tabs to show alert details', async () => {
      renderResult = mockedContext.render(
        <SessionViewDetailPanel
          alerts={mockAlerts}
          selectedProcess={sessionViewBasicProcessMock}
          onProcessSelected={mockOnProcessSelected}
          onShowAlertDetails={mockShowAlertDetails}
        />
      );

      renderResult.queryByText('Alerts')?.click();
      expect(renderResult.queryByText('List view')).toBeVisible();
    });
    it('alert tab disabled when no alerts', async () => {
      renderResult = mockedContext.render(
        <SessionViewDetailPanel
          alerts={[]}
          selectedProcess={sessionViewBasicProcessMock}
          onProcessSelected={mockOnProcessSelected}
          onShowAlertDetails={mockShowAlertDetails}
        />
      );

      renderResult.queryByText('Alerts')?.click();
      expect(renderResult.queryByText('List view')).toBeFalsy();
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mockAlerts } from '../../../common/mocks/constants/session_view_process.mock';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import { ProcessTreeAlert } from './index';

const mockAlert = mockAlerts[0];
const TEST_ID = `sessionView:sessionViewAlertDetail-${mockAlert.kibana?.alert.uuid}`;
const ALERT_RULE_NAME = mockAlert.kibana?.alert.rule.name;
const ALERT_STATUS = mockAlert.kibana?.alert.workflow_status;

describe('ProcessTreeAlerts component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
  });

  describe('When ProcessTreeAlert is mounted', () => {
    it('should render alert row correctly', async () => {
      renderResult = mockedContext.render(
        <ProcessTreeAlert
          alert={mockAlert}
          isInvestigated={false}
          isSelected={false}
          onClick={jest.fn()}
          selectAlert={jest.fn()}
        />
      );

      expect(renderResult.queryByTestId(TEST_ID)).toBeTruthy();
      expect(renderResult.queryByText(ALERT_RULE_NAME!)).toBeTruthy();
      expect(renderResult.queryByText(ALERT_STATUS!)).toBeTruthy();
    });

    it('should execute onClick callback', async () => {
      const mockFn = jest.fn();
      renderResult = mockedContext.render(
        <ProcessTreeAlert
          alert={mockAlert}
          isInvestigated={false}
          isSelected={false}
          onClick={mockFn}
          selectAlert={jest.fn()}
        />
      );

      const alertRow = renderResult.queryByTestId(TEST_ID);
      expect(alertRow).toBeTruthy();
      alertRow?.click();
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });
});

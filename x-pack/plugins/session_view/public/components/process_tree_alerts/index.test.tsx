/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mockAlerts } from '../../../common/mocks/constants/session_view_process.mock';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import { ProcessTreeAlertsDeps, ProcessTreeAlerts } from './index';

describe('ProcessTreeAlerts component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;
  const props: ProcessTreeAlertsDeps = {
    alerts: mockAlerts,
    onAlertSelected: jest.fn(),
    handleOnAlertDetailsClosed: jest.fn(),
  };

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
  });

  describe('When ProcessTreeAlerts is mounted', () => {
    it('should return null if no alerts', async () => {
      renderResult = mockedContext.render(<ProcessTreeAlerts {...props} alerts={[]} />);

      expect(renderResult.queryByTestId('sessionView:sessionViewAlertDetails')).toBeNull();
    });

    it('should return an array of alert details', async () => {
      renderResult = mockedContext.render(<ProcessTreeAlerts {...props} />);

      expect(renderResult.queryByTestId('sessionView:sessionViewAlertDetails')).toBeTruthy();
      mockAlerts.forEach((alert) => {
        if (!alert.kibana) {
          return;
        }
        const { uuid } = alert.kibana.alert;

        expect(
          renderResult.queryByTestId(`sessionView:sessionViewAlertDetail-${uuid}`)
        ).toBeTruthy();
      });
    });

    it('should execute onAlertSelected when clicking on an alert', async () => {
      const mockFn = jest.fn();
      renderResult = mockedContext.render(
        <ProcessTreeAlerts {...props} onAlertSelected={mockFn} />
      );

      expect(renderResult.queryByTestId('sessionView:sessionViewAlertDetails')).toBeTruthy();

      const testAlertRow = renderResult.queryByTestId(
        `sessionView:sessionViewAlertDetail-${mockAlerts[0].kibana?.alert.uuid}`
      );
      expect(testAlertRow).toBeTruthy();
      testAlertRow?.click();
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });
});

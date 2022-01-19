/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mockAlerts } from '../../../common/mocks/constants/session_view_process.mock';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import { ProcessTreeAlerts } from './index';

describe('ProcessTreeAlerts component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
  });

  describe('When ProcessTreeAlerts is mounted', () => {
    it('should return null if no alerts', async () => {
      renderResult = mockedContext.render(<ProcessTreeAlerts alerts={[]} />);

      expect(renderResult.queryByTestId('sessionViewAlertDetails')).toBeNull();
    });

    it('should return an array of alert details', async () => {
      renderResult = mockedContext.render(<ProcessTreeAlerts alerts={mockAlerts} />);

      expect(renderResult.queryByTestId('sessionViewAlertDetails')).toBeTruthy();
      mockAlerts.forEach((alert) => {
        if (!alert.kibana) {
          return;
        }
        const { uuid, rule, original_event: event, workflow_status: status } = alert.kibana.alert;
        const { name, query, severity } = rule;

        expect(renderResult.queryByTestId(`sessionViewAlertDetail-${uuid}`)).toBeTruthy();
        expect(renderResult.queryByTestId(`sessionViewAlertDetailViewRule-${uuid}`)).toBeTruthy();
        expect(renderResult.queryAllByText(new RegExp(event.action, 'i')).length).toBeTruthy();
        expect(renderResult.queryAllByText(new RegExp(status, 'i')).length).toBeTruthy();
        expect(renderResult.queryAllByText(new RegExp(name, 'i')).length).toBeTruthy();
        expect(renderResult.queryAllByText(new RegExp(query, 'i')).length).toBeTruthy();
        expect(renderResult.queryAllByText(new RegExp(severity, 'i')).length).toBeTruthy();
      });
    });
  });
});

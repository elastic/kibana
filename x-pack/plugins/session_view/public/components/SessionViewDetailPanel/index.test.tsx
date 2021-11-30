/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import 'jest-canvas-mock';
import {
  sessionViewBasicProcessMock,
  sessionViewAlertProcessMock,
} from '../../../common/mocks/constants/session_view_process.mock';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import { SessionViewDetailPanel } from './index';

describe('SessionView component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
  });

  describe('When SessionViewDetailPanel is mounted', () => {
    it('should show session detail and server detail when no process is selected', async () => {
      renderResult = mockedContext.render(
        <SessionViewDetailPanel
          isDetailMounted={true}
          height={400}
          selectedProcess={null}
          setIsDetailOpen={() => jest.fn()}
        />
      );
      // see if loader is present
      expect(renderResult.queryByTestId('sessionViewDetailPanelCommandDetail')).toBeNull();
      expect(renderResult.queryByTestId('sessionViewDetailPanelSessionDetail')).toBeTruthy();
      expect(renderResult.queryByTestId('sessionViewDetailPanelServerDetail')).toBeTruthy();
      expect(renderResult.queryByTestId('sessionViewDetailPanelAlertDetail')).toBeNull();
    });

    it('should show command detail when selectedProcess is present', async () => {
      renderResult = mockedContext.render(
        <SessionViewDetailPanel
          isDetailMounted={true}
          height={400}
          selectedProcess={sessionViewBasicProcessMock}
          setIsDetailOpen={() => jest.fn()}
        />
      );
      expect(renderResult.queryByTestId('sessionViewDetailPanelCommandDetail')).toBeTruthy();
      expect(renderResult.queryByTestId('sessionViewDetailPanelSessionDetail')).toBeTruthy();
      expect(renderResult.queryByTestId('sessionViewDetailPanelServerDetail')).toBeTruthy();
      expect(renderResult.queryByTestId('sessionViewDetailPanelAlertDetail')).toBeNull();
    });

    it('should show command and alerts detail if selectedProcess contains a signal event', async () => {
      renderResult = mockedContext.render(
        <SessionViewDetailPanel
          isDetailMounted={true}
          height={400}
          selectedProcess={sessionViewAlertProcessMock}
          setIsDetailOpen={() => jest.fn()}
        />
      );
      expect(renderResult.queryByTestId('sessionViewDetailPanelCommandDetail')).toBeTruthy();
      expect(renderResult.queryByTestId('sessionViewDetailPanelSessionDetail')).toBeTruthy();
      expect(renderResult.queryByTestId('sessionViewDetailPanelServerDetail')).toBeTruthy();
      expect(renderResult.queryByTestId('sessionViewDetailPanelAlertDetail')).toBeTruthy();
    });
  });
});

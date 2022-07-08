/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import { WIDGET_TOGGLE_SHOW, WIDGET_TOGGLE_HIDE } from '../../../common/translations';
import { WidgetsToggle, TOGGLE_TEST_ID } from '.';

describe('WidgetsToggle component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;
  const handleToggleHideWidgets = jest.fn();

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
  });

  describe('When PercentWidget is mounted', () => {
    it('show "hide widgets" text when shouldHideWidgets is false', async () => {
      renderResult = mockedContext.render(
        <WidgetsToggle
          shouldHideWidgets={false}
          handleToggleHideWidgets={handleToggleHideWidgets}
        />
      );

      expect(renderResult.getByText(WIDGET_TOGGLE_HIDE)).toBeVisible();
    });
    it('show "show widgets" text when shouldHideWidgets is true', async () => {
      renderResult = mockedContext.render(
        <WidgetsToggle shouldHideWidgets={true} handleToggleHideWidgets={handleToggleHideWidgets} />
      );

      expect(renderResult.getByText(WIDGET_TOGGLE_SHOW)).toBeVisible();
    });
    it('shouldHideWidgets defaults to false when not provided', async () => {
      renderResult = mockedContext.render(
        <WidgetsToggle handleToggleHideWidgets={handleToggleHideWidgets} />
      );

      expect(renderResult.getByText(WIDGET_TOGGLE_HIDE)).toBeVisible();
    });
    it('clicking the toggle fires the callback', async () => {
      renderResult = mockedContext.render(
        <WidgetsToggle handleToggleHideWidgets={handleToggleHideWidgets} />
      );

      renderResult.queryByTestId(TOGGLE_TEST_ID)?.click();
      expect(handleToggleHideWidgets).toHaveBeenCalledTimes(1);
    });
  });
});

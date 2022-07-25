/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import { CHART_TOGGLE_SHOW, CHART_TOGGLE_HIDE } from '../../../common/translations';
import { ChartsToggle, TOGGLE_TEST_ID } from '.';

describe('ChartsToggle component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;
  const handleToggleHideCharts = jest.fn();

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
  });

  describe('When ChartsToggle is mounted', () => {
    it('show "hide charts" text when shouldHideCharts is false', async () => {
      renderResult = mockedContext.render(
        <ChartsToggle shouldHideCharts={false} handleToggleHideCharts={handleToggleHideCharts} />
      );

      expect(renderResult.getByText(CHART_TOGGLE_HIDE)).toBeVisible();
    });
    it('show "show charts" text when shouldHideCharts is true', async () => {
      renderResult = mockedContext.render(
        <ChartsToggle shouldHideCharts={true} handleToggleHideCharts={handleToggleHideCharts} />
      );

      expect(renderResult.getByText(CHART_TOGGLE_SHOW)).toBeVisible();
    });
    it('shouldHideCharts defaults to false when not provided', async () => {
      renderResult = mockedContext.render(
        <ChartsToggle handleToggleHideCharts={handleToggleHideCharts} />
      );

      expect(renderResult.getByText(CHART_TOGGLE_HIDE)).toBeVisible();
    });
    it('clicking the toggle fires the callback', async () => {
      renderResult = mockedContext.render(
        <ChartsToggle handleToggleHideCharts={handleToggleHideCharts} />
      );

      renderResult.queryByTestId(TOGGLE_TEST_ID)?.click();
      expect(handleToggleHideCharts).toHaveBeenCalledTimes(1);
    });
  });
});

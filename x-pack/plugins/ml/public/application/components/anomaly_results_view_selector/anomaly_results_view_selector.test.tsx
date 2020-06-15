/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Router } from 'react-router-dom';
import { render, fireEvent } from '@testing-library/react';
import { createBrowserHistory } from 'history';

import { I18nProvider } from '@kbn/i18n/react';

import { AnomalyResultsViewSelector } from './index';

describe('AnomalyResultsViewSelector', () => {
  test('should create selector with correctly selected value', () => {
    const history = createBrowserHistory();

    const { getByTestId } = render(
      <I18nProvider>
        <Router history={history}>
          <AnomalyResultsViewSelector viewId="timeseriesexplorer" />
        </Router>
      </I18nProvider>
    );

    // Check the Single Metric Viewer element exists in the selector, and that it is checked.
    expect(getByTestId('mlAnomalyResultsViewSelectorSingleMetricViewer')).toBeInTheDocument();
    expect(
      getByTestId('mlAnomalyResultsViewSelectorSingleMetricViewer').hasAttribute('checked')
    ).toBe(true);
  });

  test('should open window to other results view when clicking on non-checked input', () => {
    // Create mock for window.open
    const mockedOpen = jest.fn();
    const originalOpen = window.open;
    window.open = mockedOpen;

    const history = createBrowserHistory();

    const { getByTestId } = render(
      <I18nProvider>
        <Router history={history}>
          <AnomalyResultsViewSelector viewId="timeseriesexplorer" />
        </Router>
      </I18nProvider>
    );

    fireEvent.click(getByTestId('mlAnomalyResultsViewSelectorExplorer'));
    expect(mockedOpen).toHaveBeenCalledWith('#/explorer', '_self');

    // Clean-up window.open.
    window.open = originalOpen;
  });
});

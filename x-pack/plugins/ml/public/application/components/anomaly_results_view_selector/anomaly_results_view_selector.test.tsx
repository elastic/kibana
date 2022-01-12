/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Router } from 'react-router-dom';
import { render } from '@testing-library/react';
import { createBrowserHistory } from 'history';

import { I18nProvider } from '@kbn/i18n-react';

import { AnomalyResultsViewSelector } from './index';

jest.mock('../../contexts/kibana', () => {
  return {
    useMlLocator: () =>
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../../../../../../../src/plugins/share/public/mocks').sharePluginMock.createLocator(),
    useNavigateToPath: () => jest.fn(),
  };
});

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
      getByTestId('mlAnomalyResultsViewSelectorSingleMetricViewer')
        .querySelector('input')!
        .hasAttribute('checked')
    ).toBe(true);
  });
});

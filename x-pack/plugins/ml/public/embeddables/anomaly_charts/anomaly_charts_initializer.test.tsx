/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AnomalyChartsInitializer } from './anomaly_charts_initializer';
import { I18nProvider } from '@kbn/i18n-react';
import React from 'react';
import { getDefaultExplorerChartsPanelTitle } from './anomaly_charts_embeddable';
const defaultOptions = { wrapper: I18nProvider };

describe('AnomalyChartsInitializer', () => {
  test('should render anomaly charts initializer', async () => {
    const onCreate = jest.fn();
    const onCancel = jest.fn();

    const jobIds = ['test-job'];
    const defaultTitle = getDefaultExplorerChartsPanelTitle(jobIds);
    const input = {
      maxSeriesToPlot: 12,
    };
    const { getByTestId } = render(
      <AnomalyChartsInitializer
        defaultTitle={defaultTitle}
        initialInput={input}
        onCreate={(params) => onCreate(params)}
        onCancel={onCancel}
      />,
      defaultOptions
    );
    const confirmButton = screen.getByText(/Confirm/i).closest('button');
    expect(confirmButton).toBeDefined();
    expect(onCreate).toHaveBeenCalledTimes(0);

    userEvent.click(confirmButton!);
    expect(onCreate).toHaveBeenCalledWith({
      panelTitle: defaultTitle,
      maxSeriesToPlot: input.maxSeriesToPlot,
    });

    userEvent.clear(await getByTestId('panelTitleInput'));
    expect(confirmButton).toHaveAttribute('disabled');
  });
});

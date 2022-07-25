/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { HasDataContextValue } from '../../../context/has_data_context';
import * as hasDataHook from '../../../hooks/use_has_data';
import { ObservabilityStatusProgress } from './observability_status_progress';
import { I18nProvider } from '@kbn/i18n-react';

describe('ObservabilityStatusProgress', () => {
  const onViewDetailsClickFn = jest.fn();

  beforeEach(() => {
    jest.spyOn(hasDataHook, 'useHasData').mockReturnValue({
      hasDataMap: {
        apm: { hasData: true, status: 'success' },
        synthetics: { hasData: true, status: 'success' },
        infra_logs: { hasData: undefined, status: 'success' },
        infra_metrics: { hasData: true, status: 'success' },
        ux: { hasData: undefined, status: 'success' },
        alert: { hasData: false, status: 'success' },
      },
      hasAnyData: true,
      isAllRequestsComplete: true,
      onRefreshTimeRange: () => {},
      forceUpdate: '',
    } as HasDataContextValue);
  });
  it('should render the progress', () => {
    render(
      <I18nProvider>
        <ObservabilityStatusProgress onViewDetailsClick={onViewDetailsClickFn} />
      </I18nProvider>
    );
    const progressBar = screen.getByRole('progressbar') as HTMLProgressElement;
    expect(progressBar).toBeInTheDocument();
    expect(progressBar.value).toBe(50);
  });

  it('should call the onViewDetailsCallback when view details button is clicked', () => {
    render(
      <I18nProvider>
        <ObservabilityStatusProgress onViewDetailsClick={onViewDetailsClickFn} />
      </I18nProvider>
    );
    fireEvent.click(screen.getByText('View details'));
    expect(onViewDetailsClickFn).toHaveBeenCalled();
  });

  it('should hide the component when dismiss button is clicked', () => {
    render(
      <I18nProvider>
        <ObservabilityStatusProgress onViewDetailsClick={onViewDetailsClickFn} />
      </I18nProvider>
    );
    fireEvent.click(screen.getByText('Dismiss'));
    expect(screen.queryByTestId('status-progress')).toBe(null);
  });
});

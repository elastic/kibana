/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { WaterfallLegends } from './waterfall_legends';
import {
  type IWaterfallLegend,
  WaterfallLegendType,
} from './waterfall/waterfall_helpers/waterfall_helpers';
import { EuiThemeProvider } from '@elastic/eui';

const createLegend = (overrides: Partial<IWaterfallLegend>): IWaterfallLegend => ({
  type: WaterfallLegendType.ServiceName,
  value: 'default-service',
  color: '#000',
  ...overrides,
});

describe('WaterfallLegends', () => {
  it('renders legends based on type service', () => {
    const legends: IWaterfallLegend[] = [
      createLegend({ type: WaterfallLegendType.ServiceName, value: 'service-a', color: '#FF0000' }),
      createLegend({ type: WaterfallLegendType.ServiceName, value: 'service-b', color: '#00FF00' }),
    ];

    const { getByText } = render(
      <EuiThemeProvider>
        <WaterfallLegends legends={legends} type={WaterfallLegendType.ServiceName} />
      </EuiThemeProvider>
    );

    expect(getByText('Services')).toBeInTheDocument();
    expect(getByText('service-a')).toBeInTheDocument();
    expect(getByText('service-b')).toBeInTheDocument();
  });

  it('renders legends based on type span', () => {
    const legends: IWaterfallLegend[] = [
      createLegend({ type: WaterfallLegendType.ServiceName, value: undefined, color: '#FF0000' }),
      createLegend({ type: WaterfallLegendType.SpanType, value: 'http', color: '#00FF00' }),
    ];

    const { getByText } = render(
      <EuiThemeProvider>
        <WaterfallLegends legends={legends} type={WaterfallLegendType.SpanType} />
      </EuiThemeProvider>
    );

    expect(getByText('Type')).toBeInTheDocument();
    expect(getByText('http')).toBeInTheDocument();
  });

  it('filters legends based on type', () => {
    const legends: IWaterfallLegend[] = [
      createLegend({ type: WaterfallLegendType.ServiceName, value: 'service-a' }),
      createLegend({ type: WaterfallLegendType.SpanType, value: 'http' }),
    ];

    const { queryByText } = render(
      <EuiThemeProvider>
        <WaterfallLegends legends={legends} type={WaterfallLegendType.ServiceName} />
      </EuiThemeProvider>
    );

    expect(queryByText('service-a')).toBeInTheDocument();
    expect(queryByText('http')).not.toBeInTheDocument();
  });

  it('uses serviceName as a fallback if legend value is empty', () => {
    const legends: IWaterfallLegend[] = [createLegend({ value: '' })];
    const { getByText } = render(
      <EuiThemeProvider>
        <WaterfallLegends
          legends={legends}
          type={WaterfallLegendType.ServiceName}
          serviceName="fallback-service"
        />
      </EuiThemeProvider>
    );
    expect(getByText('fallback-service')).toBeInTheDocument();
  });
});

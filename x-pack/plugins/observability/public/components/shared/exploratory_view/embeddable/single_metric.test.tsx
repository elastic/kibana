/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { SingleMetric } from './single_metric';

describe('SingleMetric', () => {
  it('renders SingleMetric without icon or postfix', async () => {
    const { container } = render(<SingleMetric />);
    expect(
      container.querySelector(`[data-test-subj="single-metric-icon"]`)
    ).not.toBeInTheDocument();
    expect(
      container.querySelector<HTMLElement>(`[data-test-subj="single-metric"]`)?.style?.maxWidth
    ).toEqual(`calc(100%)`);
    expect(
      container.querySelector(`[data-test-subj="single-metric-postfix"]`)
    ).not.toBeInTheDocument();
  });

  it('renders SingleMetric icon', async () => {
    const { container } = render(<SingleMetric metricIcon="storage" />);
    expect(
      container.querySelector<HTMLElement>(`[data-test-subj="single-metric"]`)?.style?.maxWidth
    ).toEqual(`calc(100% - 30px)`);
    expect(container.querySelector(`[data-test-subj="single-metric-icon"]`)).toBeInTheDocument();
  });

  it('renders SingleMetric postfix', async () => {
    const { container, getByText } = render(
      <SingleMetric metricIcon="storage" metricPostfix="Host" />
    );
    expect(getByText('Host')).toBeInTheDocument();
    expect(
      container.querySelector<HTMLElement>(`[data-test-subj="single-metric"]`)?.style?.maxWidth
    ).toEqual(`calc(100% - 30px - 150px)`);
    expect(container.querySelector(`[data-test-subj="single-metric-postfix"]`)).toBeInTheDocument();
    expect(
      container.querySelector<HTMLElement>(`[data-test-subj="single-metric-postfix"]`)?.style
        ?.maxWidth
    ).toEqual(`150px`);
  });
});

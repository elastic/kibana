/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { EvidenceChart, InvestigationEvidence } from '@kbn/significant-events-schema';
import { EvidenceList } from './evidence_list';

const renderEvidence = (evidence: InvestigationEvidence[]) =>
  render(
    <I18nProvider>
      <EvidenceList evidence={evidence} />
    </I18nProvider>
  );

const sampleChart: EvidenceChart = {
  type: 'line',
  title: 'orders-api pool utilization',
  x_axis: { type: 'time' },
  y_axis: { unit: 'percent' },
  series: [
    {
      name: 'orders-api',
      points: [
        { x: '2026-07-28T14:00:00Z', y: 42 },
        { x: '2026-07-28T14:05:00Z', y: 100 },
      ],
    },
  ],
  annotations: [{ x: '2026-07-28T14:02:00Z', label: 'Deploy' }],
};

const chartEvidence: InvestigationEvidence = {
  description: 'Pool utilization saturates at **14:02**.',
  chart: sampleChart,
};

describe('EvidenceList', () => {
  it('renders nothing when there is no evidence', () => {
    const { container } = renderEvidence([]);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the description as markdown', () => {
    renderEvidence([chartEvidence]);

    expect(screen.getByText('14:02').tagName).toBe('STRONG');
  });

  it('renders markdown tables', () => {
    renderEvidence([{ description: '| host | cpu |\n| --- | --- |\n| a | 99% |' }]);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('99%')).toBeInTheDocument();
  });

  it('renders the chart title when evidence carries a chart', () => {
    renderEvidence([chartEvidence]);

    expect(screen.getByTestId('investigationEvidenceChart')).toHaveTextContent(
      'orders-api pool utilization'
    );
  });

  it('lists every series in the legend of a multi-series chart', () => {
    renderEvidence([
      {
        description: 'Latency by repository.',
        chart: {
          ...sampleChart,
          series: [
            { name: 'elastic/kibana p99', points: [{ x: '2026-07-28T14:00:00Z', y: 1 }] },
            { name: 'all other repositories p99', points: [{ x: '2026-07-28T14:00:00Z', y: 2 }] },
          ],
        },
      },
    ]);

    const legend = screen.getByTestId('investigationEvidenceChartLegend');
    expect(legend).toHaveTextContent('elastic/kibana p99');
    expect(legend).toHaveTextContent('all other repositories p99');
  });

  it('renders no legend for a single-series chart', () => {
    renderEvidence([chartEvidence]);

    expect(screen.queryByTestId('investigationEvidenceChartLegend')).not.toBeInTheDocument();
  });

  it('renders an observation without a chart', () => {
    renderEvidence([{ description: 'All checkout pods were in CrashLoopBackOff.' }]);

    expect(screen.getByText('All checkout pods were in CrashLoopBackOff.')).toBeInTheDocument();
    expect(screen.queryByTestId('investigationEvidenceChart')).not.toBeInTheDocument();
  });

  it('renders one row per observation', () => {
    renderEvidence([chartEvidence, { description: 'Pods restarted.' }]);

    expect(screen.getAllByTestId('investigationEvidenceItem')).toHaveLength(2);
  });

  it('opens absolute links in a new tab', () => {
    renderEvidence([{ description: 'See [the runbook](https://example.com/runbook).' }]);

    const link = screen.getByRole('link', { name: /the runbook/ });
    expect(link).toHaveAttribute('href', 'https://example.com/runbook');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('does not link relative or non-http urls', () => {
    renderEvidence([
      { description: '[relative](/app/management) and [script](javascript:alert(1))' },
    ]);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('never renders images, which would fetch model-chosen urls', () => {
    const { container } = renderEvidence([
      { description: 'Before ![tracking pixel](https://attacker.example/p.png) after' },
    ]);

    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText(/tracking pixel/)).toBeInTheDocument();
  });

  it('does not render raw html', () => {
    const { container } = renderEvidence([{ description: '<img src="https://x.example/a.png">' }]);

    expect(container.querySelector('img')).toBeNull();
  });
});

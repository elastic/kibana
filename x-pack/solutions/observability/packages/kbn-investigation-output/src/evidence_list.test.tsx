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

  it('renders no series legend entry for a single-series chart', () => {
    renderEvidence([{ ...chartEvidence, chart: { ...sampleChart, annotations: undefined } }]);

    expect(screen.queryByTestId('investigationEvidenceChartLegend')).not.toBeInTheDocument();
  });

  it('lists only the annotations in the legend of a single-series chart', () => {
    renderEvidence([chartEvidence]);

    const legend = screen.getByTestId('investigationEvidenceChartLegend');
    expect(legend).toHaveTextContent('Deploy');
    expect(legend).not.toHaveTextContent('orders-api');
  });

  it('renders an observation without a chart', () => {
    renderEvidence([{ description: 'All checkout pods were in CrashLoopBackOff.' }]);

    expect(screen.getByText('All checkout pods were in CrashLoopBackOff.')).toBeInTheDocument();
    expect(screen.queryByTestId('investigationEvidenceChart')).not.toBeInTheDocument();
  });

  it('renders chart-only evidence without a description', () => {
    renderEvidence([{ chart: sampleChart }]);

    expect(screen.getByTestId('investigationEvidenceChart')).toBeInTheDocument();
    expect(screen.getByTestId('investigationEvidenceItem')).not.toHaveTextContent('saturates');
  });

  it('renders one row per observation', () => {
    renderEvidence([chartEvidence, { description: 'Pods restarted.' }]);

    expect(screen.getAllByTestId('investigationEvidenceItem')).toHaveLength(2);
  });
});

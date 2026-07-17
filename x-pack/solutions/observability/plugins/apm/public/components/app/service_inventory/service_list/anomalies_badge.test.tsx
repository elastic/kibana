/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AnomalyDetectorType } from '@kbn/apm-types';
import { MockApmPluginContextWrapper } from '../../../../context/apm_plugin/mock_apm_plugin_context';
import type { AnomaliesBadgeNavigationProps } from './anomalies_badge';
import { AnomaliesBadge } from './anomalies_badge';

const baseQuery = {
  environment: 'ENVIRONMENT_ALL',
  kuery: '',
  rangeFrom: 'now-15m',
  rangeTo: 'now',
  serviceGroup: '',
  comparisonEnabled: false,
};

const regularClickProps: AnomaliesBadgeNavigationProps = {
  serviceName: 'opbeans-java',
  agentName: 'nodejs',
  query: baseQuery,
  anomalyEnvironment: 'production',
};

const mobileClickProps: AnomaliesBadgeNavigationProps = {
  serviceName: 'opbeans-android',
  agentName: 'android/java',
  query: baseQuery,
  anomalyEnvironment: 'mobile',
};

const CRITICAL_SEVERITY = 82;
const MAJOR_SEVERITY = 72;

function renderBadge(ui: React.ReactElement) {
  return render(<MockApmPluginContextWrapper>{ui}</MockApmPluginContextWrapper>);
}

async function getTooltipText(): Promise<string | null | undefined> {
  const anchor = document.querySelector('.euiToolTipAnchor');
  expect(anchor).not.toBeNull();
  fireEvent.mouseOver(anchor!);

  await waitFor(() => {
    expect(document.querySelector('.euiToolTipPopover')).not.toBeNull();
  });

  return document.querySelector('.euiToolTipPopover')?.textContent;
}

describe('AnomaliesBadge', () => {
  it('names the anomalous detector in the tooltip when a detectorType is provided', async () => {
    renderBadge(
      <AnomaliesBadge score={CRITICAL_SEVERITY} detectorType={AnomalyDetectorType.txFailureRate} />
    );

    expect(await getTooltipText()).toBe('Anomaly score (max.): 82.00 - Failed transaction rate');
  });

  it('falls back to a score-only tooltip when no detectorType is provided', async () => {
    renderBadge(<AnomaliesBadge score={CRITICAL_SEVERITY} detectorType={undefined} />);

    expect(await getTooltipText()).toBe('Anomaly score (max.): 82.00');
  });

  it('shows the unknown tooltip when no score is available', async () => {
    renderBadge(<AnomaliesBadge score={undefined} detectorType={AnomalyDetectorType.txLatency} />);

    expect(await getTooltipText()).toBe(
      'No anomaly score is available for the selected time range.'
    );
  });

  it('renders "None" when the anomaly score is zero', () => {
    renderBadge(<AnomaliesBadge score={0} detectorType={AnomalyDetectorType.txLatency} />);

    expect(screen.getByTestId('apmAnomaliesBadge')).toHaveTextContent('None');
  });

  it('renders "None" when the anomaly score displays as 0.00', () => {
    renderBadge(<AnomaliesBadge score={0.004} detectorType={AnomalyDetectorType.txLatency} />);

    expect(screen.getByTestId('apmAnomaliesBadge')).toHaveTextContent('None');
  });

  it('renders "Low" when the anomaly score is above the none threshold', () => {
    renderBadge(<AnomaliesBadge score={0.01} detectorType={AnomalyDetectorType.txLatency} />);

    expect(screen.getByTestId('apmAnomaliesBadge')).toHaveTextContent('Low (0)');
  });

  it('shows the none tooltip when the anomaly score is zero', async () => {
    renderBadge(<AnomaliesBadge score={0} detectorType={AnomalyDetectorType.txLatency} />);

    expect(await getTooltipText()).toBe('No anomalies detected for the selected time range.');
  });

  it('renders as non-interactive when the anomaly score is zero', () => {
    renderBadge(
      <AnomaliesBadge
        score={0}
        detectorType={AnomalyDetectorType.txLatency}
        navigationProps={regularClickProps}
      />
    );

    expect(screen.getByTestId('apmAnomaliesBadge').closest('a')).toBeNull();
  });

  it('links to the regular service overview with proper params', () => {
    renderBadge(
      <AnomaliesBadge
        score={CRITICAL_SEVERITY}
        detectorType={AnomalyDetectorType.txLatency}
        navigationProps={{
          ...regularClickProps,
          query: { ...baseQuery, kuery: 'service.name: "foo"' },
        }}
      />
    );

    const href = screen.getByTestId('apmAnomaliesBadge').closest('a')?.getAttribute('href');
    const [pathname, search] = href!.split('?');

    expect(pathname).toContain('/services/opbeans-java/overview');
    expect(Object.fromEntries(new URLSearchParams(search))).toMatchObject({
      kuery: '',
      anomalyThreshold: 'critical',
      environment: 'production',
    });
  });

  it('links to the mobile service overview for a mobile agent with proper params', () => {
    renderBadge(
      <AnomaliesBadge
        score={MAJOR_SEVERITY}
        detectorType={undefined}
        navigationProps={mobileClickProps}
      />
    );

    const href = screen.getByTestId('apmAnomaliesBadge').closest('a')?.getAttribute('href');
    const [pathname, search] = href!.split('?');

    expect(pathname).toContain('/mobile-services/opbeans-android/overview');
    expect(Object.fromEntries(new URLSearchParams(search))).toMatchObject({
      kuery: '',
      anomalyThreshold: 'major',
      environment: 'mobile',
    });
  });

  it('renders as non-interactive when interactionProps is not provided', () => {
    renderBadge(<AnomaliesBadge score={CRITICAL_SEVERITY} detectorType={undefined} />);

    expect(screen.getByTestId('apmAnomaliesBadge').closest('a')).toBeNull();
  });
});

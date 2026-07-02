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
import { useApmRouter } from '../../../../hooks/use_apm_router';

// Passes through to the real implementation by default, so the existing
// tests below still exercise real href-building via `MockApmPluginContextWrapper`.
// Overridden per-test (see "renders without a provider...") to isolate `AnomaliesBadge`
// from `useApmRouter`'s own dependency on `ApmPluginContext` (for basePath prepending),
// which is a separate, pre-existing concern from the one under test here.
jest.mock('../../../../hooks/use_apm_router', () => ({
  useApmRouter: jest.fn(jest.requireActual('../../../../hooks/use_apm_router').useApmRouter),
}));

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
};

const mobileClickProps: AnomaliesBadgeNavigationProps = {
  serviceName: 'opbeans-android',
  agentName: 'android/java',
  query: baseQuery,
};

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
    renderBadge(<AnomaliesBadge score={82} detectorType={AnomalyDetectorType.txFailureRate} />);

    expect(await getTooltipText()).toBe('Anomaly score (max.): 82.00 - Failed transaction rate');
  });

  it('falls back to a score-only tooltip when no detectorType is provided', async () => {
    renderBadge(<AnomaliesBadge score={82} detectorType={undefined} />);

    expect(await getTooltipText()).toBe('Anomaly score (max.): 82.00');
  });

  it('shows the unknown tooltip when no score is available', async () => {
    renderBadge(<AnomaliesBadge score={undefined} detectorType={AnomalyDetectorType.txLatency} />);

    expect(await getTooltipText()).toBe(
      'No anomaly score is available for the selected time range.'
    );
  });

  it('links to the regular service overview with kuery stripped', () => {
    renderBadge(
      <AnomaliesBadge
        score={82}
        detectorType={AnomalyDetectorType.txLatency}
        navigationProps={{
          ...regularClickProps,
          query: { ...baseQuery, kuery: 'service.name: "foo"' },
        }}
      />
    );

    const href = screen.getByTestId('apmAnomaliesBadge').closest('a')?.getAttribute('href');
    expect(href).toContain('/services/opbeans-java/overview');
    expect(href).not.toContain('foo');
  });

  it('links to the mobile service overview for a mobile agent', () => {
    renderBadge(
      <AnomaliesBadge score={82} detectorType={undefined} navigationProps={mobileClickProps} />
    );

    const href = screen.getByTestId('apmAnomaliesBadge').closest('a')?.getAttribute('href');
    expect(href).toContain('/mobile-services/opbeans-android/overview');
  });

  it('renders as non-interactive when interactionProps is not provided', () => {
    renderBadge(<AnomaliesBadge score={82} detectorType={undefined} />);

    expect(screen.getByTestId('apmAnomaliesBadge').closest('a')).toBeNull();
  });

  it('degrades to a plain link instead of crashing when rendered without an ApmPluginContext provider', () => {
    // Mirrors the Agent Builder service-map attachment, which renders shared
    // service-map components without `ApmPluginContext.Provider` — the context's
    // default value is `{}`, so `core.application.navigateToUrl` is undefined.
    jest.mocked(useApmRouter).mockReturnValueOnce({
      link: (path: string, { path: pathParams, query }: any) =>
        `${path.replace('{serviceName}', pathParams.serviceName)}?${new URLSearchParams(
          query
        ).toString()}`,
    } as ReturnType<typeof useApmRouter>);

    expect(() =>
      render(
        <AnomaliesBadge
          score={82}
          detectorType={undefined}
          navigationProps={regularClickProps}
          navigateOnClick
        />
      )
    ).not.toThrow();

    const badge = screen.getByTestId('apmAnomaliesBadge');
    const link = badge.closest('a');
    // `navigateOnClick` was requested, but with no `navigateToUrl` available the
    // badge falls back to a plain href-based link rather than a broken onClick.
    expect(link).not.toBeNull();
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining('/services/opbeans-java/overview')
    );

    expect(() => fireEvent.click(link!)).not.toThrow();
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { AnomalyDetectorType } from '@kbn/apm-types';
import type { AnomaliesBadgeNavigationProps } from './anomalies_badge';
import { AnomaliesBadge } from './anomalies_badge';

// Production `getRedirectUrl` builds `/app/r?...` (share redirect). The mock must
// return that path so tests fail if the badge uses it instead of `getUrl`.
const SHARE_REDIRECT_URL = '/app/r?l=APM_LOCATOR&lz=compressed-payload';

const mockGetRedirectUrl = jest.fn().mockReturnValue(SHARE_REDIRECT_URL);

const mockGetUrl = jest
  .fn()
  .mockImplementation(async ({ serviceName, isMobileAgentName, query }: any) => {
    const base = isMobileAgentName
      ? `/app/apm/mobile-services/${serviceName}/overview`
      : `/app/apm/services/${serviceName}/overview`;
    const params = new URLSearchParams();
    Object.entries(query ?? {}).forEach(([k, v]) => {
      if (v !== undefined) params.set(k, String(v));
    });
    return `${base}?${params.toString()}`;
  });

const mockLocators = {
  get: jest.fn().mockReturnValue({ getUrl: mockGetUrl, getRedirectUrl: mockGetRedirectUrl }),
} as unknown as AnomaliesBadgeNavigationProps['locators'];

const regularClickProps: AnomaliesBadgeNavigationProps = {
  serviceName: 'opbeans-java',
  agentName: 'nodejs',
  anomalyEnvironment: 'production',
  rangeFrom: 'now-15m',
  rangeTo: 'now',
  locators: mockLocators,
};

const mobileClickProps: AnomaliesBadgeNavigationProps = {
  serviceName: 'opbeans-android',
  agentName: 'android/java',
  anomalyEnvironment: 'mobile',
  rangeFrom: 'now-15m',
  rangeTo: 'now',
  locators: mockLocators,
};

const CRITICAL_SEVERITY = 82;
const MAJOR_SEVERITY = 72;

function renderBadge(ui: React.ReactElement) {
  return render(<EuiProvider>{ui}</EuiProvider>);
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

async function getBadgeHref(): Promise<string> {
  await waitFor(() => {
    expect(screen.getByTestId('apmAnomaliesBadge')).toHaveAttribute('href');
  });
  return screen.getByTestId('apmAnomaliesBadge').getAttribute('href')!;
}

async function getBadgeHrefParts(): Promise<[string, string]> {
  const href = await getBadgeHref();
  const [pathname, search] = href.split('?');
  return [pathname, search];
}

function expectInAppExpectedBoundsNavigation(pathname: string, search: string) {
  expect(pathname).toMatch(/^\/app\/apm\//);
  expect(pathname).not.toContain('/app/r');
  expect(Object.fromEntries(new URLSearchParams(search)).offset).toBe('expected_bounds');
  expect(mockGetUrl).toHaveBeenCalledWith(
    expect.objectContaining({
      query: expect.objectContaining({ offset: 'expected_bounds' }),
    }),
    undefined
  );
  expect(mockGetRedirectUrl).not.toHaveBeenCalled();
}

describe('AnomaliesBadge', () => {
  beforeEach(() => {
    mockGetUrl.mockClear();
    mockGetRedirectUrl.mockClear();
  });

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

    expect(await getTooltipText()).toBe('No anomalies detected.');
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

  it('links to the regular service overview from outside with proper params', async () => {
    renderBadge(
      <AnomaliesBadge
        score={CRITICAL_SEVERITY}
        detectorType={AnomalyDetectorType.txLatency}
        navigationProps={regularClickProps}
      />
    );

    const [pathname, search] = await getBadgeHrefParts();

    expect(pathname).toContain('/services/opbeans-java/overview');
    expect(Object.fromEntries(new URLSearchParams(search))).toMatchObject({
      kuery: '',
      anomalyThreshold: 'critical',
      environment: 'production',
      comparisonEnabled: 'true',
      offset: 'expected_bounds',
    });
    expectInAppExpectedBoundsNavigation(pathname, search);
    expect(await getTooltipText()).toContain('Click to view more.');
  });

  it('links to the mobile service overview for a mobile agent from outside with proper params', async () => {
    renderBadge(
      <AnomaliesBadge
        score={MAJOR_SEVERITY}
        detectorType={undefined}
        navigationProps={mobileClickProps}
      />
    );

    const [pathname, search] = await getBadgeHrefParts();

    expect(pathname).toContain('/mobile-services/opbeans-android/overview');
    expect(Object.fromEntries(new URLSearchParams(search))).toMatchObject({
      kuery: '',
      anomalyThreshold: 'major',
      environment: 'mobile',
      comparisonEnabled: 'true',
      offset: 'expected_bounds',
    });
    expectInAppExpectedBoundsNavigation(pathname, search);
    expect(await getTooltipText()).toContain('Click to view more.');
  });

  it('renders as non-interactive when interactionProps is not provided', () => {
    renderBadge(<AnomaliesBadge score={CRITICAL_SEVERITY} detectorType={undefined} />);

    expect(screen.getByTestId('apmAnomaliesBadge').closest('a')).toBeNull();
  });

  it('links to service overview without expected bounds when rendered in service overview and comparisonEnabled is false', async () => {
    renderBadge(
      <AnomaliesBadge
        score={CRITICAL_SEVERITY}
        detectorType={AnomalyDetectorType.txLatency}
        navigationProps={{
          ...regularClickProps,
          isInServiceOverview: true,
          comparisonEnabled: false,
        }}
      />
    );

    const [pathname, search] = await getBadgeHrefParts();

    expect(pathname).toContain('/services/opbeans-java/overview');
    expect(Object.fromEntries(new URLSearchParams(search))).toMatchObject({
      comparisonEnabled: 'false',
      offset: 'expected_bounds',
    });
    expectInAppExpectedBoundsNavigation(pathname, search);
    expect(await getTooltipText()).toContain('Click to hide expected bounds.');
  });

  it('links to service overview with expected bounds when rendered in service overview and comparisonEnabled is true', async () => {
    renderBadge(
      <AnomaliesBadge
        score={CRITICAL_SEVERITY}
        detectorType={AnomalyDetectorType.txLatency}
        navigationProps={{
          ...regularClickProps,
          isInServiceOverview: true,
          comparisonEnabled: true,
        }}
      />
    );

    const [pathname, search] = await getBadgeHrefParts();

    expect(pathname).toContain('/services/opbeans-java/overview');
    expect(Object.fromEntries(new URLSearchParams(search))).toMatchObject({
      comparisonEnabled: 'true',
      offset: 'expected_bounds',
    });
    expectInAppExpectedBoundsNavigation(pathname, search);
    expect(await getTooltipText()).toContain('Click to view expected bounds.');
  });

  it('does not use getRedirectUrl (/app/r), which full-reloads APM and drops expected-bounds comparison', async () => {
    renderBadge(
      <AnomaliesBadge
        score={CRITICAL_SEVERITY}
        detectorType={AnomalyDetectorType.txLatency}
        navigationProps={regularClickProps}
      />
    );

    const href = await getBadgeHref();

    expect(href).not.toBe(SHARE_REDIRECT_URL);
    expect(href).not.toMatch(/\/app\/r(\?|$)/);
    expect(href).toContain('/app/apm/services/opbeans-java/overview');
    expect(href).toContain('offset=expected_bounds');
    expect(href).toContain('comparisonEnabled=true');
    expect(mockGetUrl).toHaveBeenCalled();
    expect(mockGetRedirectUrl).not.toHaveBeenCalled();
  });
});

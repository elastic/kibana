/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { AnomalyDetectorType } from '@kbn/apm-types';
import { FlyoutAnomaliesBadge } from './flyout_anomalies_badge';
import type { FlyoutAnomaliesBadgeNavigationProps } from './flyout_anomalies_badge';

const mockPrepend = jest.fn((path: string) => `/base${path}`);
const mockUseServiceFlyoutContext = jest.fn();
jest.mock('../service_flyout_context', () => ({
  useServiceFlyoutContext: () => mockUseServiceFlyoutContext(),
}));

const baseNavigationProps: FlyoutAnomaliesBadgeNavigationProps = {
  serviceName: 'opbeans-java',
  agentName: 'java',
  anomalyEnvironment: 'production',
  rangeFrom: 'now-15m',
  rangeTo: 'now',
};

const mobileNavigationProps: FlyoutAnomaliesBadgeNavigationProps = {
  serviceName: 'opbeans-android',
  agentName: 'android/java',
  anomalyEnvironment: 'production',
  rangeFrom: 'now-15m',
  rangeTo: 'now',
};

const CRITICAL_SCORE = 82;
const UNKNOWN_SCORE = 0;

function renderBadge(
  score: number | undefined,
  detectorType: AnomalyDetectorType | undefined,
  navigationProps?: FlyoutAnomaliesBadgeNavigationProps
) {
  return render(
    <IntlProvider locale="en">
      <FlyoutAnomaliesBadge
        score={score}
        detectorType={detectorType}
        navigationProps={navigationProps}
      />
    </IntlProvider>
  );
}

function getHref(): string | null | undefined {
  return screen.getByTestId('apmAnomaliesBadge').closest('a')?.getAttribute('href');
}

describe('FlyoutAnomaliesBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseServiceFlyoutContext.mockReturnValue({
      core: { http: { basePath: { prepend: mockPrepend } } },
    });
  });

  describe('URL building', () => {
    it('links to the regular service overview for non-mobile agents', () => {
      renderBadge(CRITICAL_SCORE, undefined, baseNavigationProps);

      const href = getHref();
      expect(href).toContain('/services/opbeans-java/overview');
      expect(href).not.toContain('/mobile-services/');
    });

    it('links to the mobile service overview for mobile agents', () => {
      renderBadge(CRITICAL_SCORE, undefined, mobileNavigationProps);

      const href = getHref();
      expect(href).toContain('/mobile-services/opbeans-android/overview');
    });

    it('includes anomaly query params in the URL', () => {
      renderBadge(CRITICAL_SCORE, undefined, baseNavigationProps);

      const href = getHref()!;
      const search = href.split('?')[1];
      const params = Object.fromEntries(new URLSearchParams(search));

      expect(params).toMatchObject({
        kuery: '',
        comparisonEnabled: 'true',
        offset: 'expected_bounds',
        environment: 'production',
        rangeFrom: 'now-15m',
        rangeTo: 'now',
      });
      expect(params.anomalyThreshold).toBeDefined();
    });

    it('omits anomalyThreshold when severity is unknown', () => {
      renderBadge(UNKNOWN_SCORE, undefined, baseNavigationProps);

      const href = getHref()!;
      const search = href.split('?')[1];
      const params = Object.fromEntries(new URLSearchParams(search));

      expect(params.anomalyThreshold).toBeUndefined();
    });

    it('prepends the base path to the URL', () => {
      renderBadge(CRITICAL_SCORE, undefined, baseNavigationProps);

      expect(mockPrepend).toHaveBeenCalledWith(expect.stringContaining('/app/apm'));
      expect(getHref()).toMatch(/^\/base/);
    });
  });

  describe('interactivity', () => {
    it('is non-interactive when navigationProps are not provided', () => {
      renderBadge(CRITICAL_SCORE, undefined, undefined);

      expect(screen.getByTestId('apmAnomaliesBadge').closest('a')).toBeNull();
    });

    it('is non-interactive when score is undefined', () => {
      renderBadge(undefined, undefined, baseNavigationProps);

      expect(screen.getByTestId('apmAnomaliesBadge').closest('a')).toBeNull();
    });
  });

  describe('tooltip', () => {
    it('shows the unknown tooltip when no score is available', async () => {
      renderBadge(undefined, undefined, undefined);

      const anchor = document.querySelector('.euiToolTipAnchor');
      fireEvent.mouseOver(anchor!);
      await waitFor(() => expect(document.querySelector('.euiToolTipPopover')).not.toBeNull());

      expect(document.querySelector('.euiToolTipPopover')?.textContent).toBe(
        'No anomaly score is available for the selected time range.'
      );
    });

    it('shows the score in the tooltip', async () => {
      renderBadge(CRITICAL_SCORE, undefined, undefined);

      const anchor = document.querySelector('.euiToolTipAnchor');
      fireEvent.mouseOver(anchor!);
      await waitFor(() => expect(document.querySelector('.euiToolTipPopover')).not.toBeNull());

      expect(document.querySelector('.euiToolTipPopover')?.textContent).toContain('82.00');
    });
  });
});

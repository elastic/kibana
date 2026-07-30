/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import type { ApmRelatedAlertsAttachmentData } from '../../../common/agent_builder/attachments';
import { AgentApmRelatedAlerts, formatAlertDuration } from './agent_apm_related_alerts';
import { createApmRelatedAlertsAttachmentDefinition } from './register_apm_related_alerts_attachment';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      http: {
        basePath: {
          prepend: (path: string) => `/base${path}`,
        },
      },
    },
  }),
}));

// ─── formatAlertDuration helpers ────────────────────────────────────────────

describe('formatAlertDuration', () => {
  it('formats sub-minute durations as seconds', () => {
    expect(formatAlertDuration(0, 45_000)).toBe('45s');
    expect(formatAlertDuration(0, 0)).toBe('0s');
  });

  it('formats durations under one hour as minutes', () => {
    expect(formatAlertDuration(0, 3 * 60 * 1000)).toBe('3m');
    expect(formatAlertDuration(0, 59 * 60 * 1000)).toBe('59m');
  });

  it('formats durations of one hour with no remainder', () => {
    expect(formatAlertDuration(0, 60 * 60 * 1000)).toBe('1h');
  });

  it('formats durations with hours and minutes', () => {
    expect(formatAlertDuration(0, (2 * 60 + 30) * 60 * 1000)).toBe('2h 30m');
  });

  it('estimates duration from start when durationMs is undefined', () => {
    // Use a known start close to now so the output is predictable
    const startMs = Date.now() - 30_000;
    const result = formatAlertDuration(startMs, undefined);
    // Duration should be ~30s (give or take 2s for test execution)
    expect(result).toMatch(/^(2[89]|30|31)s$/);
  });
});

// ─── Render tests ────────────────────────────────────────────────────────────

const now = 1_700_000_000_000;

const activeAlert: ApmRelatedAlertsAttachmentData['alerts'][number] = {
  id: 'alert-1',
  ruleName: 'High error rate',
  ruleTypeId: 'apm.transaction_error_rate',
  status: 'active',
  reason: 'Error rate 22% > 10% threshold',
  serviceName: 'checkout',
  start: now - 5 * 60 * 1000,
  duration: 5 * 60 * 1000,
  severity: 'critical',
};

const recoveredAlert: ApmRelatedAlertsAttachmentData['alerts'][number] = {
  id: 'alert-2',
  ruleName: 'Latency threshold',
  ruleTypeId: 'apm.transaction_duration',
  status: 'recovered',
  start: now - 20 * 60 * 1000,
  duration: 15 * 60 * 1000,
};

function renderComponent(data: ApmRelatedAlertsAttachmentData) {
  return render(
    <EuiThemeProvider>
      <AgentApmRelatedAlerts data={data} />
    </EuiThemeProvider>
  );
}

describe('AgentApmRelatedAlerts rendering', () => {
  it('renders nothing when data is undefined', () => {
    const { container } = render(<AgentApmRelatedAlerts />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the empty-state prompt when alerts array is empty', () => {
    renderComponent({ serviceName: 'checkout', alerts: [] });
    expect(screen.getByText('No active alerts')).toBeInTheDocument();
  });

  it('renders the service name in the default title', () => {
    renderComponent({ serviceName: 'checkout', alerts: [] });
    expect(screen.getByText(/checkout/i)).toBeInTheDocument();
  });

  it('renders a custom title when provided', () => {
    renderComponent({ serviceName: 'checkout', alerts: [], title: 'Active Alerts — checkout' });
    expect(screen.getByText('Active Alerts — checkout')).toBeInTheDocument();
  });

  it('renders the alert count for non-empty alerts', () => {
    renderComponent({ serviceName: 'checkout', alerts: [activeAlert] });
    expect(screen.getByText(/1 alert/i)).toBeInTheDocument();
  });

  it('renders the rule name as a link with the correct href', () => {
    renderComponent({ serviceName: 'checkout', alerts: [activeAlert] });
    const link = screen.getByRole('link', { name: 'High error rate' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/base/app/observability/alerts/alert-1');
  });

  it('renders "Active" status label for active alerts', () => {
    renderComponent({ serviceName: 'checkout', alerts: [activeAlert] });
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders "Recovered" status label for recovered alerts', () => {
    renderComponent({ serviceName: 'checkout', alerts: [recoveredAlert] });
    expect(screen.getByText('Recovered')).toBeInTheDocument();
  });

  it('renders the alert reason when present', () => {
    renderComponent({ serviceName: 'checkout', alerts: [activeAlert] });
    expect(screen.getByText('Error rate 22% > 10% threshold')).toBeInTheDocument();
  });

  it('renders an em-dash when reason is absent', () => {
    renderComponent({ serviceName: 'checkout', alerts: [recoveredAlert] });
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders both active and recovered alerts in the same table', () => {
    renderComponent({ serviceName: 'checkout', alerts: [activeAlert, recoveredAlert] });
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Recovered')).toBeInTheDocument();
    expect(screen.getByText(/2 alerts/i)).toBeInTheDocument();
  });
});

// ─── Registration definition tests ──────────────────────────────────────────

describe('createApmRelatedAlertsAttachmentDefinition', () => {
  const def = createApmRelatedAlertsAttachmentDefinition();

  it('returns icon "bell"', () => {
    expect(def.getIcon()).toBe('bell');
  });

  it('returns the title field from attachment data when present', () => {
    const attachment = {
      id: 'a',
      type: 'observability.apm-related-alerts' as const,
      data: {
        serviceName: 'checkout',
        alerts: [],
        title: 'Related Alerts — checkout',
      },
    };
    expect(def.getLabel(attachment)).toBe('Related Alerts — checkout');
  });

  it('falls back to "Related Alerts" when no title', () => {
    const attachment = {
      id: 'a',
      type: 'observability.apm-related-alerts' as const,
      data: { serviceName: 'checkout', alerts: [] },
    };
    expect(def.getLabel(attachment)).toBe('Related Alerts');
  });
});

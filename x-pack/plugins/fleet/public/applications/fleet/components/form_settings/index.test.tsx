/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, fireEvent } from '@testing-library/react';

import React from 'react';

import { z } from '@kbn/zod';

import { zodStringWithDurationValidation } from '../../../../../common/settings/agent_policy_settings';
import type { SettingsConfig } from '../../../../../common/settings/types';
import { createFleetTestRendererMock } from '../../../../mock';

import { ConfiguredSettings } from '.';

const mockUpdateAgentPolicy = jest.fn();
const mockUpdateAdvancedSettingsHasErrors = jest.fn();

jest.mock('../../sections/agent_policy/components/agent_policy_form', () => ({
  useAgentPolicyFormContext: () => ({
    updateAdvancedSettingsHasErrors: mockUpdateAdvancedSettingsHasErrors,
    updateAgentPolicy: mockUpdateAgentPolicy,
    agentPolicy: {
      advanced_settings: {
        agent_limits_go_max_procs: 0,
        agent_download_timeout: '120s',
      },
    },
  }),
}));

describe('ConfiguredSettings', () => {
  const testRenderer = createFleetTestRendererMock();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function render(settingsConfig: SettingsConfig[]) {
    return testRenderer.render(<ConfiguredSettings configuredSettings={settingsConfig} />);
  }

  it('should render number field', () => {
    const result = render([
      {
        name: 'agent.limits.go_max_procs',
        title: 'GO_MAX_PROCS',
        description: 'Description',
        learnMoreLink: '',
        api_field: {
          name: 'agent_limits_go_max_procs',
        },
        schema: z.number().int().min(0).default(0),
      },
    ]);

    expect(result.getByText('GO_MAX_PROCS')).not.toBeNull();
    const input = result.getByTestId('configuredSetting-agent.limits.go_max_procs');
    expect(input).toHaveValue(0);

    act(() => {
      fireEvent.change(input, { target: { value: '1' } });
    });

    expect(mockUpdateAgentPolicy).toHaveBeenCalledWith(
      expect.objectContaining({
        advanced_settings: expect.objectContaining({ agent_limits_go_max_procs: 1 }),
      })
    );
  });

  it('should render string field with time duration validation', () => {
    const result = render([
      {
        name: 'agent.download.timeout',
        title: 'Agent binary download timeout',
        description: 'Description',
        learnMoreLink: '',
        api_field: {
          name: 'agent_download_timeout',
        },
        schema: zodStringWithDurationValidation.default('120s'),
      },
    ]);

    expect(result.getByText('Agent binary download timeout')).not.toBeNull();
    const input = result.getByTestId('configuredSetting-agent.download.timeout');
    expect(input).toHaveValue('120s');

    act(() => {
      fireEvent.change(input, { target: { value: '120' } });
    });

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(
      result.getByText('Must be a string with a time unit, e.g. 30s, 5m, 2h, 1d')
    ).not.toBeNull();
    expect(mockUpdateAdvancedSettingsHasErrors).toHaveBeenCalledWith(true);
  });

  it('should render field group', () => {
    const result = render([
      {
        name: 'agent.monitoring.http',
        api_field: {
          name: 'agent_monitoring_http',
        },
        title: 'Agent HTTP monitoring',
        description: 'Agent HTTP monitoring settings',
        learnMoreLink:
          'https://www.elastic.co/guide/en/fleet/current/enable-custom-policy-settings.html#override-default-monitoring-port',
        schema: z
          .object({
            enabled: z.boolean().describe('Enabled').default(false),
            host: z.string().describe('Host').default('localhost'),
            port: z.number().describe('Port').min(0).max(65353).default(6791),
            'buffer.enabled': z.boolean().describe('Buffer Enabled').default(false),
          })
          .default({}),
      },
    ]);

    expect(result.getByText('Agent HTTP monitoring')).not.toBeNull();
    expect(result.getByText('Buffer Enabled')).not.toBeNull();
    const switches = result.getAllByRole('switch');
    expect(switches).toHaveLength(2);
    expect(switches[0]).not.toBeChecked();
    expect(switches[1]).not.toBeChecked();
    const port = result.getByTestId('configuredSetting-agent.monitoring.http-port');
    expect(port).toHaveValue(6791);
    const host = result.getByTestId('configuredSetting-agent.monitoring.http-host');
    expect(host).toHaveValue('localhost');

    act(() => {
      fireEvent.click(switches[0]);
    });

    expect(mockUpdateAgentPolicy).toHaveBeenCalledWith(
      expect.objectContaining({
        advanced_settings: expect.objectContaining({ agent_monitoring_http: { enabled: true } }),
      })
    );

    act(() => {
      fireEvent.change(port, { target: { value: '6792' } });
    });

    expect(mockUpdateAgentPolicy).toHaveBeenCalledWith(
      expect.objectContaining({
        advanced_settings: expect.objectContaining({ agent_monitoring_http: { port: 6792 } }),
      })
    );

    act(() => {
      fireEvent.change(host, { target: { value: '1.2.3.4' } });
    });

    expect(mockUpdateAgentPolicy).toHaveBeenCalledWith(
      expect.objectContaining({
        advanced_settings: expect.objectContaining({ agent_monitoring_http: { host: '1.2.3.4' } }),
      })
    );
  });

  it('should not render field if hidden', () => {
    const result = render([
      {
        name: 'agent.limits.go_max_procs',
        hidden: true,
        title: 'GO_MAX_PROCS',
        description: 'Description',
        learnMoreLink: '',
        api_field: {
          name: 'agent_limits_go_max_procs',
        },
        schema: z.number().int().min(0).default(0),
      },
    ]);

    expect(result.queryByText('GO_MAX_PROCS')).toBeNull();
  });
});

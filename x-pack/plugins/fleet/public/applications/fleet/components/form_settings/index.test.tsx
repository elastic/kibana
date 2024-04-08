/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, fireEvent } from '@testing-library/react';

import React from 'react';

import { z } from 'zod';

import { zodStringWithDurationValidation } from '../../../../../common/settings/agent_policy_settings';
import type { SettingsConfig } from '../../../../../common/settings/types';
import { createFleetTestRendererMock } from '../../../../mock';

import { ConfiguredSettings } from '.';

describe('ConfiguredSettings', () => {
  const testRenderer = createFleetTestRendererMock();
  const updateAdvancedSettingsHasErrors = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function render(settingsConfig: SettingsConfig[]) {
    return testRenderer.render(
      <ConfiguredSettings
        configuredSettings={settingsConfig}
        updateAdvancedSettingsHasErrors={updateAdvancedSettingsHasErrors}
      />
    );
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
    expect(result.getByTestId('configuredSetting-agent.limits.go_max_procs')).toHaveValue(0);
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

    expect(updateAdvancedSettingsHasErrors).toHaveBeenCalledWith(true);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(
      result.getByText('Must be a string with a time unit, e.g. 30s, 5m, 2h, 1d')
    ).not.toBeNull();
  });
});

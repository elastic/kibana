/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import * as observabilityPublic from '@kbn/observability-plugin/public';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { render, makeUptimePermissionsCore } from '../../../lib/helper/rtl_helpers';
import { ManagementSettings } from './management_settings';

jest.mock('@kbn/observability-plugin/public');

describe('<ManagementSettings />', () => {
  const state = {
    monitorManagementList: {
      enablement: {
        canManageApiKeys: true,
      },
    },
  };

  beforeAll(() => {
    jest.spyOn(observabilityPublic, 'useFetcher').mockReturnValue({
      data: undefined,
      status: observabilityPublic.FETCH_STATUS.SUCCESS,
      refetch: () => {},
    });
  });

  it('shows popover on click', () => {
    jest.spyOn(observabilityPublic, 'useFetcher').mockReturnValue({
      data: undefined,
      status: observabilityPublic.FETCH_STATUS.SUCCESS,
      refetch: () => {},
    });
    render(<ManagementSettings />);

    expect(screen.queryByText('Generate API key')).not.toBeInTheDocument();
    userEvent.click(screen.getByTestId('uptimeMonitorManagementApiKeyPopoverTrigger'));
    expect(
      screen.getByText(/Use an API key to push monitors remotely from a CLI or CD pipeline/)
    ).toBeInTheDocument();
  });

  it('shows appropriate content when user does not have correct uptime save permissions', () => {
    // const apiKey = 'sampleApiKey';
    render(<ManagementSettings />, {
      state,
      core: makeUptimePermissionsCore({ save: false }),
    });

    userEvent.click(screen.getByTestId('uptimeMonitorManagementApiKeyPopoverTrigger'));
    expect(screen.getByText(/Please contact your administrator./)).toBeInTheDocument();
  });

  it('shows appropriate content when user does not api key management permissions', () => {
    render(<ManagementSettings />, {
      state: {
        monitorManagementList: {
          enablement: {
            canManageApiKeys: false,
          },
        },
      },
      core: makeUptimePermissionsCore({ save: true }),
    });

    userEvent.click(screen.getByTestId('uptimeMonitorManagementApiKeyPopoverTrigger'));
    expect(screen.getByText(/Please contact your administrator./)).toBeInTheDocument();
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import * as observabilityPublic from '@kbn/observability-plugin/public';
import { screen } from '@testing-library/react';
import { ProjectAPIKeys } from './project_api_keys';
import { makeUptimePermissionsCore, render } from '../../../utils/testing';

jest.mock('@kbn/observability-plugin/public');

describe('<ProjectAPIKeys />', () => {
  const state = {
    syntheticsEnablement: {
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

  it('shows the button', () => {
    jest.spyOn(observabilityPublic, 'useFetcher').mockReturnValue({
      data: undefined,
      status: observabilityPublic.FETCH_STATUS.SUCCESS,
      refetch: () => {},
    });
    render(<ProjectAPIKeys />);

    expect(screen.queryByText('Generate API key')).not.toBeInTheDocument();
    expect(
      screen.getByText(/Use an API key to push monitors remotely from a CLI or CD pipeline/)
    ).toBeInTheDocument();
  });

  it('shows appropriate content when user does not have correct uptime save permissions', () => {
    // const apiKey = 'sampleApiKey';
    render(<ProjectAPIKeys />, {
      state,
      core: makeUptimePermissionsCore({ save: false }),
    });

    expect(screen.getByText(/Please contact your administrator./)).toBeInTheDocument();
  });

  it('shows appropriate content when user does not api key management permissions', () => {
    render(<ProjectAPIKeys />, {
      state: {
        syntheticsEnablement: {
          enablement: {
            canManageApiKeys: false,
          },
        },
      },
      core: makeUptimePermissionsCore({ save: true }),
    });

    expect(screen.getByText(/Please contact your administrator./)).toBeInTheDocument();
  });
});

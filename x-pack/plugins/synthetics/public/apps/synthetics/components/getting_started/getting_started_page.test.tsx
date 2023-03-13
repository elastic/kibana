/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import * as permissionsHooks from '../../hooks/use_fleet_permissions';
import { render } from '../../utils/testing/rtl_helpers';
import { GettingStartedPage } from './getting_started_page';
import * as privateLocationsHooks from '../settings/private_locations/hooks/use_locations_api';

describe('GettingStartedPage', () => {
  beforeEach(() => {
    jest.spyOn(privateLocationsHooks, 'usePrivateLocationsAPI').mockReturnValue({
      loading: false,
      privateLocations: [],
      deleteLoading: false,
      onSubmit: jest.fn(),
      onDelete: jest.fn(),
      formData: undefined,
    });
    jest.spyOn(permissionsHooks, 'useCanManagePrivateLocation').mockReturnValue(true);
  });
  it('works with cloud locations', () => {
    const { getByText } = render(<GettingStartedPage />, {
      state: {
        serviceLocations: {
          locations: [
            {
              id: 'us_central',
              label: 'Us Central',
            },
            {
              id: 'us_east',
              label: 'US East',
            },
          ],
          locationsLoaded: true,
          loading: false,
        },
        agentPolicies: {
          loading: false,
        },
      },
    });

    // page is loaded
    expect(getByText('Create a single page browser monitor')).toBeInTheDocument();
  });

  it('serves on prem getting started experience when locations are not available', () => {
    const { getByText } = render(<GettingStartedPage />, {
      state: {
        serviceLocations: {
          locations: [],
          locationsLoaded: true,
          loading: false,
        },
      },
    });

    // page is loaded
    expect(getByText('Get started with synthetic monitoring')).toBeInTheDocument();
  });

  it('shows need agent flyout when isAddingNewPrivateLocation is true and agentPolicies.length === 0', async () => {
    const { getByText, getByRole, queryByLabelText } = render(<GettingStartedPage />, {
      state: {
        serviceLocations: {
          locations: [],
          locationsLoaded: true,
          loading: false,
        },
        agentPolicies: {
          data: {
            total: 0,
          },
          isAddingNewPrivateLocation: true,
        },
      },
    });

    // page is loaded
    expect(getByText('Get started with synthetic monitoring')).toBeInTheDocument();

    expect(getByRole('heading', { name: 'Create private location', level: 2 }));
    expect(getByText('No agent policies found')).toBeInTheDocument();
    expect(getByRole('link', { name: 'Create agent policy' })).toBeEnabled();
    expect(queryByLabelText('Location name')).not.toBeInTheDocument();
    expect(queryByLabelText('Agent policy')).not.toBeInTheDocument();
  });

  it('shows add location flyout when isAddingNewPrivateLocation is true and agentPolicies.length > 0', async () => {
    const { getByText, getByRole, getByLabelText, queryByText } = render(<GettingStartedPage />, {
      state: {
        serviceLocations: {
          locations: [],
          locationsLoaded: true,
          loading: false,
        },
        agentPolicies: {
          data: {
            total: 1,
            items: [{}],
          },
          isAddingNewPrivateLocation: true,
        },
      },
    });

    // page is loaded
    expect(getByText('Get started with synthetic monitoring')).toBeInTheDocument();

    expect(getByRole('heading', { name: 'Create private location', level: 2 }));
    expect(queryByText('No agent policies found')).not.toBeInTheDocument();
    expect(getByLabelText('Location name')).toBeInTheDocument();
    expect(getByLabelText('Agent policy')).toBeInTheDocument();
  });

  it('shows permissions callout and hides form when agent policies are available but the user does not have permissions', async () => {
    jest.spyOn(permissionsHooks, 'useCanManagePrivateLocation').mockReturnValue(false);
    const { getByText, getByRole, queryByLabelText, queryByRole } = render(<GettingStartedPage />, {
      state: {
        serviceLocations: {
          locations: [],
          locationsLoaded: true,
          loading: false,
        },
        agentPolicies: {
          data: {
            total: 1,
            items: [{}],
          },
          isAddingNewPrivateLocation: true,
        },
      },
    });

    // page is loaded
    expect(getByText('Get started with synthetic monitoring')).toBeInTheDocument();

    expect(getByRole('heading', { name: 'Create private location', level: 2 }));
    expect(queryByLabelText('Location name')).not.toBeInTheDocument();
    expect(queryByLabelText('Agent policy')).not.toBeInTheDocument();
    expect(queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    expect(getByText("You're missing some Kibana privileges to manage private locations"));
  });

  it('shows permissions callout when agent policy is needed but the user does not have permissions', async () => {
    jest.spyOn(permissionsHooks, 'useCanManagePrivateLocation').mockReturnValue(false);
    const { getByText, getByRole, queryByLabelText } = render(<GettingStartedPage />, {
      state: {
        serviceLocations: {
          locations: [],
          locationsLoaded: true,
          loading: false,
        },
        agentPolicies: {
          data: undefined, // data will be undefined when user does not have permissions
          isAddingNewPrivateLocation: true,
        },
      },
    });

    // page is loaded
    expect(getByText('Get started with synthetic monitoring')).toBeInTheDocument();

    expect(getByRole('heading', { name: 'Create private location', level: 2 }));
    expect(queryByLabelText('Location name')).not.toBeInTheDocument();
    expect(queryByLabelText('Agent policy')).not.toBeInTheDocument();
    expect(getByText("You're missing some Kibana privileges to manage private locations"));
  });
});

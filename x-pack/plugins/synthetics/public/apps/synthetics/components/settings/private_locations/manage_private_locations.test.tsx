/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../../utils/testing/rtl_helpers';
import * as permissionsHooks from '../../../hooks';
import * as locationHooks from './hooks/use_locations_api';
import * as settingsHooks from '../../../contexts/synthetics_settings_context';
import type { SyntheticsSettingsContextValues } from '../../../contexts';
import { ManagePrivateLocations } from './manage_private_locations';
import { PrivateLocation } from '../../../../../../common/runtime_types';

jest.mock('../../../hooks');
jest.mock('./hooks/use_locations_api');
jest.mock('../../../contexts/synthetics_settings_context');

describe('<ManagePrivateLocations />', () => {
  beforeEach(() => {
    jest.spyOn(permissionsHooks, 'useCanManagePrivateLocation').mockReturnValue(true);
    jest.spyOn(permissionsHooks, 'useFleetPermissions').mockReturnValue({
      canReadAgentPolicies: true,
      canSaveIntegrations: false,
    });
    jest.spyOn(locationHooks, 'usePrivateLocationsAPI').mockReturnValue({
      formData: {} as PrivateLocation,
      loading: false,
      onSubmit: jest.fn(),
      privateLocations: [],
      onDelete: jest.fn(),
      deleteLoading: false,
    });
    jest.spyOn(settingsHooks, 'useSyntheticsSettingsContext').mockReturnValue({
      canSave: true,
    } as SyntheticsSettingsContextValues);
  });

  it.each([true, false])(
    'handles no agent found when the user does and does not have permissions',
    (hasFleetPermissions) => {
      jest
        .spyOn(permissionsHooks, 'useCanManagePrivateLocation')
        .mockReturnValue(hasFleetPermissions);
      const { getByText, getByRole, queryByText } = render(<ManagePrivateLocations />, {
        state: {
          agentPolicies: {
            data: {
              items: [],
              total: 0,
              page: 1,
              perPage: 20,
            },
            loading: false,
            error: null,
            isManageFlyoutOpen: false,
            isAddingNewPrivateLocation: false,
          },
        },
      });
      expect(getByText('No agent policies found')).toBeInTheDocument();

      if (hasFleetPermissions) {
        const button = getByRole('link', { name: 'Create agent policy' });
        expect(button).not.toBeDisabled();
        expect(
          queryByText(/You are not authorized to manage private locations./)
        ).not.toBeInTheDocument();
      } else {
        const button = getByRole('button', { name: 'Create agent policy' });
        expect(button).toBeDisabled();
        expect(getByText(/You are not authorized to manage private locations./));
      }
    }
  );

  it.each([true, false])(
    'handles create first location when the user does and does not have permissions',
    (hasFleetPermissions) => {
      jest
        .spyOn(permissionsHooks, 'useCanManagePrivateLocation')
        .mockReturnValue(hasFleetPermissions);
      const { getByText, getByRole, queryByText } = render(<ManagePrivateLocations />, {
        state: {
          agentPolicies: {
            data: {
              items: [{}],
              total: 1,
              page: 1,
              perPage: 20,
            },
            loading: false,
            error: null,
            isManageFlyoutOpen: false,
            isAddingNewPrivateLocation: false,
          },
        },
      });
      expect(getByText('Create your first private location')).toBeInTheDocument();
      const button = getByRole('button', { name: 'Create location' });

      if (hasFleetPermissions) {
        expect(button).not.toBeDisabled();
        expect(
          queryByText(/You are not authorized to manage private locations./)
        ).not.toBeInTheDocument();
      } else {
        expect(button).toBeDisabled();
        expect(getByText(/You are not authorized to manage private locations./));
      }
    }
  );

  it.each([true, false])(
    'handles location table when the user does and does not have permissions',
    (hasFleetPermissions) => {
      const privateLocationName = 'Test private location';
      jest
        .spyOn(permissionsHooks, 'useCanManagePrivateLocation')
        .mockReturnValue(hasFleetPermissions);
      jest.spyOn(permissionsHooks, 'useFleetPermissions').mockReturnValue({
        canSaveIntegrations: hasFleetPermissions,
        canReadAgentPolicies: hasFleetPermissions,
      });
      jest.spyOn(locationHooks, 'usePrivateLocationsAPI').mockReturnValue({
        formData: {} as PrivateLocation,
        loading: false,
        onSubmit: jest.fn(),
        privateLocations: [
          {
            label: privateLocationName,
            id: 'lkjlere',
            agentPolicyId: 'lkjelrje',
            isServiceManaged: false,
            concurrentMonitors: 2,
          },
        ],
        onDelete: jest.fn(),
        deleteLoading: false,
      });
      const { getByText, getByRole, queryByText } = render(<ManagePrivateLocations />, {
        state: {
          agentPolicies: {
            data: {
              items: [{}],
              total: 1,
              page: 1,
              perPage: 20,
            },
            loading: false,
            error: null,
            isManageFlyoutOpen: false,
            isAddingNewPrivateLocation: false,
          },
        },
      });
      expect(getByText(privateLocationName)).toBeInTheDocument();
      const button = getByRole('button', { name: 'Create location' });

      if (hasFleetPermissions) {
        expect(button).not.toBeDisabled();
        expect(
          queryByText(/You are not authorized to manage private locations./)
        ).not.toBeInTheDocument();
      } else {
        expect(button).toBeDisabled();
        expect(getByText(/You are not authorized to manage private locations./));
      }
    }
  );
});

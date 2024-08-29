/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import crypto from 'crypto';
import React from 'react';

import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { Role } from '@kbn/security-plugin-types-common';
import {
  createRawKibanaPrivileges,
  kibanaFeatures,
} from '@kbn/security-role-management-model/src/__fixtures__';

import { PrivilegesRolesForm } from './space_assign_role_privilege_form';
import type { Space } from '../../../../../common';
import { createPrivilegeAPIClientMock } from '../../../privilege_api_client.mock';
import { createRolesAPIClientMock } from '../../../roles_api_client.mock';

const rolesAPIClient = createRolesAPIClientMock();
const privilegeAPIClient = createPrivilegeAPIClientMock();

const createRole = (roleName: string, kibana: Role['kibana'] = []): Role => {
  return {
    name: roleName,
    elasticsearch: { cluster: [], run_as: [], indices: [] },
    kibana,
  };
};

const space: Space = {
  id: crypto.randomUUID(),
  name: 'Odyssey',
  description: 'Journey vs. Destination',
  disabledFeatures: [],
};

const spacesClientsInvocatorMock = jest.fn((fn) =>
  fn({
    rolesClient: rolesAPIClient,
    privilegesClient: privilegeAPIClient,
  })
);
const dispatchMock = jest.fn();
const onSaveCompleted = jest.fn();
const closeFlyout = jest.fn();

const renderPrivilegeRolesForm = ({
  preSelectedRoles,
}: {
  preSelectedRoles?: Role[];
} = {}) => {
  return render(
    <IntlProvider locale="en">
      <PrivilegesRolesForm
        {...{
          space,
          features: kibanaFeatures,
          closeFlyout,
          defaultSelected: preSelectedRoles,
          onSaveCompleted,
          storeDispatch: dispatchMock,
          spacesClientsInvocator: spacesClientsInvocatorMock,
        }}
      />
    </IntlProvider>
  );
};

describe('PrivilegesRolesForm', () => {
  let getRolesSpy: jest.SpiedFunction<ReturnType<typeof createRolesAPIClientMock>['getRoles']>;
  let getAllKibanaPrivilegeSpy: jest.SpiedFunction<
    ReturnType<typeof createPrivilegeAPIClientMock>['getAll']
  >;

  beforeAll(() => {
    getRolesSpy = jest.spyOn(rolesAPIClient, 'getRoles');
    getAllKibanaPrivilegeSpy = jest.spyOn(privilegeAPIClient, 'getAll');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the privilege permission selector disabled when no role is selected', async () => {
    getRolesSpy.mockResolvedValue([]);
    getAllKibanaPrivilegeSpy.mockResolvedValue(createRawKibanaPrivileges(kibanaFeatures));

    renderPrivilegeRolesForm();

    await waitFor(() => null);

    ['all', 'read', 'custom'].forEach((privilege) => {
      expect(screen.getByTestId(`${privilege}-privilege-button`)).toBeDisabled();
    });
  });

  it('preselects the privilege of the selected role when one is provided', async () => {
    getRolesSpy.mockResolvedValue([]);
    getAllKibanaPrivilegeSpy.mockResolvedValue(createRawKibanaPrivileges(kibanaFeatures));

    const privilege = 'all';

    renderPrivilegeRolesForm({
      preSelectedRoles: [
        createRole('test_role_1', [{ base: [privilege], feature: {}, spaces: [space.id] }]),
      ],
    });

    await waitFor(() => null);

    expect(screen.getByTestId(`${privilege}-privilege-button`)).toHaveAttribute(
      'aria-pressed',
      String(true)
    );
  });

  it('displays a warning message when roles with different privilege levels are selected', async () => {
    getRolesSpy.mockResolvedValue([]);
    getAllKibanaPrivilegeSpy.mockResolvedValue(createRawKibanaPrivileges(kibanaFeatures));

    const roles: Role[] = [
      createRole('test_role_1', [{ base: ['all'], feature: {}, spaces: [space.id] }]),
      createRole('test_role_2', [{ base: ['read'], feature: {}, spaces: [space.id] }]),
    ];

    renderPrivilegeRolesForm({
      preSelectedRoles: roles,
    });

    await waitFor(() => null);

    expect(screen.getByTestId('privilege-conflict-callout')).toBeInTheDocument();
  });

  describe('applying custom privileges', () => {
    it('displays the privilege customization form, when custom privilege button is selected', async () => {
      getRolesSpy.mockResolvedValue([]);
      getAllKibanaPrivilegeSpy.mockResolvedValue(createRawKibanaPrivileges(kibanaFeatures));

      const roles: Role[] = [
        createRole('test_role_1', [{ base: ['all'], feature: {}, spaces: [space.id] }]),
      ];

      renderPrivilegeRolesForm({
        preSelectedRoles: roles,
      });

      await waitFor(() => null);

      expect(screen.queryByTestId('rolePrivilegeCustomizationForm')).not.toBeInTheDocument();

      userEvent.click(screen.getByTestId('custom-privilege-button'));

      expect(screen.getByTestId('rolePrivilegeCustomizationForm')).toBeInTheDocument();
    });

    it('for a selection of roles pre-assigned to a space, the first encountered privilege with a custom privilege is used as the starting point', async () => {
      getRolesSpy.mockResolvedValue([]);
      getAllKibanaPrivilegeSpy.mockResolvedValue(createRawKibanaPrivileges(kibanaFeatures));

      const featureIds: string[] = kibanaFeatures.map((kibanaFeature) => kibanaFeature.id);

      const roles: Role[] = [
        createRole('test_role_1', [{ base: ['all'], feature: {}, spaces: [space.id] }]),
        createRole('test_role_2', [
          { base: [], feature: { [featureIds[0]]: ['all'] }, spaces: [space.id] },
        ]),
        createRole('test_role_3', [{ base: ['read'], feature: {}, spaces: [space.id] }]),
        createRole('test_role_4', [{ base: ['read'], feature: {}, spaces: [space.id] }]),
        createRole('test_role_5', [
          { base: [], feature: { [featureIds[0]]: ['read'] }, spaces: [space.id] },
        ]),
      ];

      renderPrivilegeRolesForm({
        preSelectedRoles: roles,
      });

      await waitFor(() => null);

      expect(screen.queryByTestId('rolePrivilegeCustomizationForm')).not.toBeInTheDocument();

      userEvent.click(screen.getByTestId('custom-privilege-button'));

      expect(screen.getByTestId('rolePrivilegeCustomizationForm')).toBeInTheDocument();

      expect(screen.queryByTestId(`${featureIds[0]}_read`)).not.toHaveAttribute(
        'aria-pressed',
        String(true)
      );

      expect(screen.getByTestId(`${featureIds[0]}_all`)).toHaveAttribute(
        'aria-pressed',
        String(true)
      );
    });
  });
});

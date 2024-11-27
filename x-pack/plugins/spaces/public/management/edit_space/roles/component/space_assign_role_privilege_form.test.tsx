/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiThemeProvider } from '@elastic/eui';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import crypto from 'crypto';
import React from 'react';

import {
  httpServiceMock,
  i18nServiceMock,
  loggingSystemMock,
  notificationServiceMock,
  overlayServiceMock,
  themeServiceMock,
} from '@kbn/core/public/mocks';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { Role, SecurityLicense } from '@kbn/security-plugin-types-common';
import {
  createRawKibanaPrivileges,
  kibanaFeatures,
} from '@kbn/security-role-management-model/src/__fixtures__';

import { PrivilegesRolesForm } from './space_assign_role_privilege_form';
import type { Space } from '../../../../../common';
import {
  FEATURE_PRIVILEGES_ALL,
  FEATURE_PRIVILEGES_CUSTOM,
  FEATURE_PRIVILEGES_READ,
} from '../../../../../common/constants';
import { spacesManagerMock } from '../../../../spaces_manager/spaces_manager.mock';
import { createPrivilegeAPIClientMock } from '../../../privilege_api_client.mock';
import { createRolesAPIClientMock } from '../../../roles_api_client.mock';
import { EditSpaceProvider } from '../../provider';

const rolesAPIClient = createRolesAPIClientMock();
const privilegeAPIClient = createPrivilegeAPIClientMock();
const http = httpServiceMock.createStartContract();
const notifications = notificationServiceMock.createStartContract();
const overlays = overlayServiceMock.createStartContract();
const theme = themeServiceMock.createStartContract();
const i18n = i18nServiceMock.createStartContract();
const logger = loggingSystemMock.createLogger();
const spacesManager = spacesManagerMock.create();

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
const licenseMock = {
  getFeatures: jest.fn(() => ({})),
} as unknown as SecurityLicense;

const renderPrivilegeRolesForm = ({
  preSelectedRoles,
}: {
  preSelectedRoles?: Role[];
} = {}) => {
  return render(
    <EuiThemeProvider>
      <IntlProvider locale="en">
        <EditSpaceProvider
          {...{
            logger,
            i18n,
            http,
            theme,
            overlays,
            notifications,
            spacesManager,
            serverBasePath: '',
            getUrlForApp: jest.fn((_) => _),
            navigateToUrl: jest.fn(),
            license: licenseMock,
            isRoleManagementEnabled: true,
            capabilities: {
              navLinks: {},
              management: {},
              catalogue: {},
              spaces: { manage: true },
            },
            dispatch: dispatchMock,
            state: {
              roles: new Map(),
              fetchRolesError: false,
            },
            invokeClient: spacesClientsInvocatorMock,
          }}
        >
          <PrivilegesRolesForm
            {...{
              space,
              features: kibanaFeatures,
              closeFlyout,
              defaultSelected: preSelectedRoles,
              onSaveCompleted,
            }}
          />
        </EditSpaceProvider>
      </IntlProvider>
    </EuiThemeProvider>
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

  it("would open the 'manage roles' link in a new tab", () => {
    getRolesSpy.mockResolvedValue([]);
    getAllKibanaPrivilegeSpy.mockResolvedValue(createRawKibanaPrivileges(kibanaFeatures));

    renderPrivilegeRolesForm();

    expect(screen.getByText('Manage roles')).toHaveAttribute('target', '_blank');
  });

  it('does not display the privilege selection buttons or customization form when no role is selected', async () => {
    getRolesSpy.mockResolvedValue([]);
    getAllKibanaPrivilegeSpy.mockResolvedValue(createRawKibanaPrivileges(kibanaFeatures));

    renderPrivilegeRolesForm();

    await waitFor(() => null);

    ['all', 'read', 'custom'].forEach((privilege) => {
      expect(screen.queryByTestId(`${privilege}-privilege-button`)).not.toBeInTheDocument();
    });

    expect(
      screen.queryByTestId('space-assign-role-privilege-customization-form')
    ).not.toBeInTheDocument();
  });

  it('renders with the assign roles button disabled when no role is selected', async () => {
    getRolesSpy.mockResolvedValue([]);
    getAllKibanaPrivilegeSpy.mockResolvedValue(createRawKibanaPrivileges(kibanaFeatures));

    renderPrivilegeRolesForm();

    await waitFor(() => null);

    expect(screen.getByTestId('space-assign-role-create-roles-privilege-button')).toBeDisabled();
  });

  it('makes a request to refetch available roles if page transitions back from a user interaction page visibility change', () => {
    getRolesSpy.mockResolvedValue([]);
    getAllKibanaPrivilegeSpy.mockResolvedValue(createRawKibanaPrivileges(kibanaFeatures));

    renderPrivilegeRolesForm();

    expect(getRolesSpy).toHaveBeenCalledTimes(1);

    // trigger click on manage roles link, which is perquisite for page visibility handler to trigger role refetch
    fireEvent.click(screen.getByText(/manage roles/i));

    // trigger page visibility change
    fireEvent(document, new Event('visibilitychange'));

    expect(getRolesSpy).toHaveBeenCalledTimes(2);
  });

  it('renders with the assign roles button disabled when no base privileges or feature privileges are selected', async () => {
    getRolesSpy.mockResolvedValue([]);
    getAllKibanaPrivilegeSpy.mockResolvedValue(createRawKibanaPrivileges(kibanaFeatures));

    const roles: Role[] = [
      createRole('test_role_1', [{ base: [], feature: {}, spaces: [space.id] }]),
    ];

    renderPrivilegeRolesForm({
      preSelectedRoles: roles,
    });

    await waitFor(() => null);

    expect(screen.getByTestId(`${FEATURE_PRIVILEGES_READ}-privilege-button`)).toHaveAttribute(
      'aria-pressed',
      String(false)
    );

    expect(
      screen.getByTestId('space-assign-role-privilege-customization-form')
    ).toBeInTheDocument();

    expect(screen.getByTestId('space-update-role-create-roles-privilege-button')).toBeDisabled();
  });

  it('preselects the privilege of the selected role when one is provided', async () => {
    getRolesSpy.mockResolvedValue([]);
    getAllKibanaPrivilegeSpy.mockResolvedValue(createRawKibanaPrivileges(kibanaFeatures));

    renderPrivilegeRolesForm({
      preSelectedRoles: [
        createRole('test_role_1', [
          { base: [FEATURE_PRIVILEGES_ALL], feature: {}, spaces: [space.id] },
        ]),
      ],
    });

    await waitFor(() => null);

    expect(screen.getByTestId(`${FEATURE_PRIVILEGES_ALL}-privilege-button`)).toHaveAttribute(
      'aria-pressed',
      String(true)
    );
  });

  it('displays the privilege customization form, when there is a selected role', async () => {
    getRolesSpy.mockResolvedValue([]);
    getAllKibanaPrivilegeSpy.mockResolvedValue(createRawKibanaPrivileges(kibanaFeatures));

    const roles: Role[] = [
      createRole('test_role_1', [
        { base: [FEATURE_PRIVILEGES_READ], feature: {}, spaces: [space.id] },
      ]),
    ];

    renderPrivilegeRolesForm({
      preSelectedRoles: roles,
    });

    await waitFor(() => null);

    expect(screen.getByTestId(`${FEATURE_PRIVILEGES_READ}-privilege-button`)).toHaveAttribute(
      'aria-pressed',
      String(true)
    );

    expect(
      screen.getByTestId('space-assign-role-privilege-customization-form')
    ).toBeInTheDocument();

    expect(
      screen.getByTestId('space-update-role-create-roles-privilege-button')
    ).not.toBeDisabled();
  });

  describe('selecting multiple roles', () => {
    it('displays a warning message when roles with different privilege levels are selected', async () => {
      getRolesSpy.mockResolvedValue([]);
      getAllKibanaPrivilegeSpy.mockResolvedValue(createRawKibanaPrivileges(kibanaFeatures));

      const roles: Role[] = [
        createRole('test_role_1', [
          { base: [FEATURE_PRIVILEGES_ALL], feature: {}, spaces: [space.id] },
        ]),
        createRole('test_role_2', [
          { base: [FEATURE_PRIVILEGES_READ], feature: {}, spaces: [space.id] },
        ]),
      ];

      renderPrivilegeRolesForm({
        preSelectedRoles: roles,
      });

      await waitFor(() => null);

      expect(screen.getByTestId('privilege-conflict-callout')).toBeInTheDocument();
    });

    it('does not display the permission conflict message when roles with the same privilege levels are selected', async () => {
      getRolesSpy.mockResolvedValue([]);
      getAllKibanaPrivilegeSpy.mockResolvedValue(createRawKibanaPrivileges(kibanaFeatures));

      const roles: Role[] = [
        createRole('test_role_1', [
          { base: [FEATURE_PRIVILEGES_READ], feature: {}, spaces: [space.id] },
        ]),
        createRole('test_role_2', [
          { base: [FEATURE_PRIVILEGES_READ], feature: {}, spaces: [space.id] },
        ]),
      ];

      renderPrivilegeRolesForm({
        preSelectedRoles: roles,
      });

      await waitFor(() => null);

      expect(screen.queryByTestId('privilege-conflict-callout')).not.toBeInTheDocument();
    });
  });

  describe('applying custom privileges', () => {
    it('for a selection of roles pre-assigned to a space, the first encountered privilege with a custom privilege is used as the starting point', async () => {
      getRolesSpy.mockResolvedValue([]);
      getAllKibanaPrivilegeSpy.mockResolvedValue(createRawKibanaPrivileges(kibanaFeatures));

      const featureIds: string[] = kibanaFeatures.map((kibanaFeature) => kibanaFeature.id);

      const roles: Role[] = [
        createRole('test_role_1', [
          { base: [FEATURE_PRIVILEGES_ALL], feature: {}, spaces: [space.id] },
        ]),
        createRole('test_role_2', [
          { base: [], feature: { [featureIds[0]]: [FEATURE_PRIVILEGES_ALL] }, spaces: [space.id] },
        ]),
        createRole('test_role_3', [
          { base: [FEATURE_PRIVILEGES_READ], feature: {}, spaces: [space.id] },
        ]),
        createRole('test_role_4', [
          { base: [FEATURE_PRIVILEGES_READ], feature: {}, spaces: [space.id] },
        ]),
        // empty base denotes role with custom privilege
        createRole('test_role_5', [
          { base: [], feature: { [featureIds[0]]: [FEATURE_PRIVILEGES_READ] }, spaces: [space.id] },
        ]),
      ];

      renderPrivilegeRolesForm({
        preSelectedRoles: roles,
      });

      await waitFor(() => null);

      await userEvent.click(screen.getByTestId('custom-privilege-button'));

      expect(screen.getByTestId(`${FEATURE_PRIVILEGES_CUSTOM}-privilege-button`)).toHaveAttribute(
        'aria-pressed',
        String(true)
      );

      expect(
        screen.getByTestId('space-assign-role-privilege-customization-form')
      ).toBeInTheDocument();

      expect(screen.queryByTestId(`${featureIds[0]}_read`)).not.toHaveAttribute(
        'aria-pressed',
        String(true)
      );

      expect(screen.getByTestId(`${featureIds[0]}_all`)).toHaveAttribute(
        'aria-pressed',
        String(true)
      );
    });

    it('allows modifying individual features after selecting a base privilege within the customize table', async () => {
      const user = userEvent.setup();

      getRolesSpy.mockResolvedValue([]);
      getAllKibanaPrivilegeSpy.mockResolvedValue(createRawKibanaPrivileges(kibanaFeatures));

      const featureIds: string[] = kibanaFeatures.map((kibanaFeature) => kibanaFeature.id);

      const roles: Role[] = [
        createRole('test_role_1', [
          { base: [FEATURE_PRIVILEGES_READ], feature: {}, spaces: [space.id] },
        ]),
      ];

      renderPrivilegeRolesForm({
        preSelectedRoles: roles,
      });

      await waitFor(() =>
        expect(screen.getByTestId(`${FEATURE_PRIVILEGES_READ}-privilege-button`)).toHaveAttribute(
          'aria-pressed',
          String(true)
        )
      );

      await user.click(screen.getByTestId('custom-privilege-button'));

      expect(screen.getByTestId(`${FEATURE_PRIVILEGES_CUSTOM}-privilege-button`)).toHaveAttribute(
        'aria-pressed',
        String(true)
      );

      expect(
        screen.getByTestId('space-assign-role-privilege-customization-form')
      ).toBeInTheDocument();

      // By default all features are set to the none privilege
      expect(screen.queryByTestId(`${featureIds[0]}_read`)).not.toHaveAttribute(
        'aria-pressed',
        String(true)
      );

      await user.click(screen.getByTestId('changeAllPrivilegesButton'));

      // change all privileges to read
      await user.click(screen.getByTestId(`changeAllPrivileges-${FEATURE_PRIVILEGES_READ}`));

      featureIds.forEach((_, idx) => {
        // verify that all features are set to read
        expect(screen.queryByTestId(`${featureIds[idx]}_read`)).toHaveAttribute(
          'aria-pressed',
          String(true)
        );
      });

      // change a single feature to all
      await user.click(screen.getByTestId(`${featureIds[0]}_all`));

      expect(screen.queryByTestId(`${featureIds[0]}_read`)).not.toHaveAttribute(
        'aria-pressed',
        String(true)
      );

      expect(screen.getByTestId(`${featureIds[0]}_all`)).toHaveAttribute(
        'aria-pressed',
        String(true)
      );
    });

    it('prevents customization up to sub privilege level by default', async () => {
      const user = userEvent.setup();

      const roles: Role[] = [
        createRole('test_role_1', [
          { base: [FEATURE_PRIVILEGES_READ], feature: {}, spaces: [space.id] },
        ]),
      ];

      getRolesSpy.mockResolvedValue([]);
      getAllKibanaPrivilegeSpy.mockResolvedValue(createRawKibanaPrivileges(kibanaFeatures));

      const featuresWithSubFeatures = kibanaFeatures.filter((kibanaFeature) =>
        Boolean(kibanaFeature.subFeatures.length)
      );

      renderPrivilegeRolesForm({
        preSelectedRoles: roles,
      });

      await user.click(screen.getByTestId('custom-privilege-button'));

      expect(
        screen.getByTestId('space-assign-role-privilege-customization-form')
      ).toBeInTheDocument();

      const featureUT = featuresWithSubFeatures[0];

      // change a single feature with sub features to read from default privilege "none"
      await user.click(screen.getByTestId(`${featureUT.id}_${FEATURE_PRIVILEGES_READ}`));

      // click on the accordion toggle to show sub features
      await user.click(
        screen.getByTestId(
          `featurePrivilegeControls_${featureUT.category.id}_${featureUT.id}_accordionToggle`
        )
      );

      // sub feature table renders
      expect(
        screen.getByTestId(`${featureUT.category.id}_${featureUT.id}_subFeaturesTable`)
      ).toBeInTheDocument();

      // assert switch to customize sub feature can toggled
      expect(
        within(
          screen.getByTestId(
            `${featureUT.category.id}_${featureUT.id}_customizeSubFeaturesSwitchContainer`
          )
        ).getByTestId('customizeSubFeaturePrivileges')
      ).toBeDisabled();
    });

    it('supports customization up to sub privilege level only when security license allows', async () => {
      const user = userEvent.setup();

      const roles: Role[] = [
        createRole('test_role_1', [
          { base: [FEATURE_PRIVILEGES_READ], feature: {}, spaces: [space.id] },
        ]),
      ];

      // enable sub feature privileges
      (licenseMock.getFeatures as jest.Mock).mockReturnValue({
        allowSubFeaturePrivileges: true,
      });

      getRolesSpy.mockResolvedValue([]);
      getAllKibanaPrivilegeSpy.mockResolvedValue(createRawKibanaPrivileges(kibanaFeatures));

      const featuresWithSubFeatures = kibanaFeatures.filter((kibanaFeature) =>
        Boolean(kibanaFeature.subFeatures.length)
      );

      renderPrivilegeRolesForm({
        preSelectedRoles: roles,
      });

      await user.click(screen.getByTestId('custom-privilege-button'));

      expect(
        screen.getByTestId('space-assign-role-privilege-customization-form')
      ).toBeInTheDocument();

      const featureUT = featuresWithSubFeatures[0];

      // change a single feature with sub features to read from default privilege "none"
      await user.click(screen.getByTestId(`${featureUT.id}_${FEATURE_PRIVILEGES_READ}`));

      // click on the accordion toggle to show sub features
      await user.click(
        screen.getByTestId(
          `featurePrivilegeControls_${featureUT.category.id}_${featureUT.id}_accordionToggle`
        )
      );

      // sub feature table renders
      expect(
        screen.getByTestId(`${featureUT.category.id}_${featureUT.id}_subFeaturesTable`)
      ).toBeInTheDocument();

      // assert switch to customize sub feature can toggled
      expect(
        within(
          screen.getByTestId(
            `${featureUT.category.id}_${featureUT.id}_customizeSubFeaturesSwitchContainer`
          )
        ).getByTestId('customizeSubFeaturePrivileges')
      ).not.toBeDisabled();
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from '@testing-library/react';
import type { ReactWrapper } from 'enzyme';
import React from 'react';

import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import type { Capabilities } from 'src/core/public';
import { coreMock, scopedHistoryMock } from 'src/core/public/mocks';
import { dataViewPluginMocks } from 'src/plugins/data_views/public/mocks';

import { KibanaFeature } from '../../../../../features/public';
import type { Space } from '../../../../../spaces/public';
import { licenseMock } from '../../../../common/licensing/index.mock';
import type { Role } from '../../../../common/model';
import { userAPIClientMock } from '../../users/index.mock';
import { createRawKibanaPrivileges } from '../__fixtures__/kibana_privileges';
import { indicesAPIClientMock, privilegesAPIClientMock, rolesAPIClientMock } from '../index.mock';
import { EditRolePage } from './edit_role_page';
import { SpaceAwarePrivilegeSection } from './privileges/kibana/space_aware_privilege_section';
import { TransformErrorSection } from './privileges/kibana/transform_error_section';

const buildFeatures = () => {
  return [
    new KibanaFeature({
      id: 'feature1',
      name: 'Feature 1',
      app: ['feature1App'],
      category: { id: 'foo', label: 'foo' },
      privileges: {
        all: {
          app: ['feature1App'],
          ui: ['feature1-ui'],
          savedObject: {
            all: [],
            read: [],
          },
        },
        read: {
          app: ['feature1App'],
          ui: ['feature1-ui'],
          savedObject: {
            all: [],
            read: [],
          },
        },
      },
    }),
    new KibanaFeature({
      id: 'feature2',
      name: 'Feature 2',
      app: ['feature2App'],
      category: { id: 'foo', label: 'foo' },
      privileges: {
        all: {
          app: ['feature2App'],
          ui: ['feature2-ui'],
          savedObject: {
            all: ['feature2'],
            read: ['config'],
          },
        },
        read: {
          app: ['feature2App'],
          ui: ['feature2-ui'],
          savedObject: {
            all: [],
            read: ['config'],
          },
        },
      },
    }),
  ] as KibanaFeature[];
};

const buildBuiltinESPrivileges = () => {
  return {
    cluster: ['all', 'manage', 'monitor'],
    index: ['all', 'read', 'write', 'index'],
  };
};

const buildUICapabilities = (canManageSpaces = true) => {
  return {
    catalogue: {},
    management: {},
    navLinks: {},
    spaces: {
      manage: canManageSpaces,
    },
  } as Capabilities;
};

const buildSpaces = () => {
  return [
    {
      id: 'default',
      name: 'Default',
      disabledFeatures: [],
      _reserved: true,
    },
    {
      id: 'space_1',
      name: 'Space 1',
      disabledFeatures: [],
    },
    {
      id: 'space_2',
      name: 'Space 2',
      disabledFeatures: ['feature2'],
    },
  ] as Space[];
};

const expectReadOnlyFormButtons = (wrapper: ReactWrapper<any, any>) => {
  expect(wrapper.find('button[data-test-subj="roleFormReturnButton"]')).toHaveLength(1);
  expect(wrapper.find('button[data-test-subj="roleFormSaveButton"]')).toHaveLength(0);
};

const expectSaveFormButtons = (wrapper: ReactWrapper<any, any>) => {
  expect(wrapper.find('button[data-test-subj="roleFormReturnButton"]')).toHaveLength(0);
  expect(wrapper.find('button[data-test-subj="roleFormSaveButton"]')).toHaveLength(1);
};

function getProps({
  action,
  role,
  canManageSpaces = true,
}: {
  action: 'edit' | 'clone';
  role?: Role;
  canManageSpaces?: boolean;
}) {
  const rolesAPIClient = rolesAPIClientMock.create();
  rolesAPIClient.getRole.mockResolvedValue(role);

  const dataViews = dataViewPluginMocks.createStartContract();
  // `undefined` titles can technically happen via import/export or other manual manipulation
  dataViews.getTitles = jest.fn().mockResolvedValue(['foo*', 'bar*', undefined]);

  const indicesAPIClient = indicesAPIClientMock.create();

  const userAPIClient = userAPIClientMock.create();
  userAPIClient.getUsers.mockResolvedValue([]);

  const privilegesAPIClient = privilegesAPIClientMock.create();
  privilegesAPIClient.getAll.mockResolvedValue(createRawKibanaPrivileges(buildFeatures()));
  privilegesAPIClient.getBuiltIn.mockResolvedValue(buildBuiltinESPrivileges());

  const license = licenseMock.create();
  license.getFeatures.mockReturnValue({
    allowRoleDocumentLevelSecurity: true,
    allowRoleFieldLevelSecurity: true,
  } as any);

  const { fatalErrors } = coreMock.createSetup();
  const { http, docLinks, notifications } = coreMock.createStart();
  http.get.mockImplementation(async (path: any) => {
    if (path === '/api/spaces/space') {
      return buildSpaces();
    }
  });

  return {
    action,
    roleName: role?.name,
    license,
    http,
    dataViews,
    indicesAPIClient,
    privilegesAPIClient,
    rolesAPIClient,
    userAPIClient,
    getFeatures: () => Promise.resolve(buildFeatures()),
    notifications,
    docLinks,
    fatalErrors,
    uiCapabilities: buildUICapabilities(canManageSpaces),
    history: scopedHistoryMock.create(),
  };
}

describe('<EditRolePage />', () => {
  describe('with spaces enabled', () => {
    it('can render a reserved role', async () => {
      const wrapper = mountWithIntl(
        <EditRolePage
          {...getProps({
            action: 'edit',
            role: {
              name: 'superuser',
              metadata: { _reserved: true },
              elasticsearch: { cluster: ['all'], indices: [], run_as: ['*'] },
              kibana: [{ spaces: ['*'], base: ['all'], feature: {} }],
            },
          })}
        />
      );

      await waitForRender(wrapper);

      expect(wrapper.find('[data-test-subj="reservedRoleBadgeTooltip"]')).toHaveLength(1);
      expect(wrapper.find(SpaceAwarePrivilegeSection)).toHaveLength(1);
      expect(wrapper.find('[data-test-subj="userCannotManageSpacesCallout"]')).toHaveLength(0);
      expectReadOnlyFormButtons(wrapper);
    });

    it('can render a user defined role', async () => {
      const wrapper = mountWithIntl(
        <EditRolePage
          {...getProps({
            action: 'edit',
            role: {
              name: 'my custom role',
              metadata: {},
              elasticsearch: { cluster: ['all'], indices: [], run_as: ['*'] },
              kibana: [{ spaces: ['*'], base: ['all'], feature: {} }],
            },
          })}
        />
      );

      await waitForRender(wrapper);

      expect(wrapper.find('[data-test-subj="reservedRoleBadgeTooltip"]')).toHaveLength(0);
      expect(wrapper.find(SpaceAwarePrivilegeSection)).toHaveLength(1);
      expect(wrapper.find('[data-test-subj="userCannotManageSpacesCallout"]')).toHaveLength(0);
      expectSaveFormButtons(wrapper);
    });

    it('can render when creating a new role', async () => {
      const wrapper = mountWithIntl(<EditRolePage {...getProps({ action: 'edit' })} />);

      await waitForRender(wrapper);

      expect(wrapper.find(SpaceAwarePrivilegeSection)).toHaveLength(1);
      expect(wrapper.find('[data-test-subj="userCannotManageSpacesCallout"]')).toHaveLength(0);
      expectSaveFormButtons(wrapper);
    });

    it('can render when cloning an existing role', async () => {
      const wrapper = mountWithIntl(
        <EditRolePage
          {...getProps({
            action: 'edit',
            role: {
              name: '',
              metadata: { _reserved: false },
              elasticsearch: {
                cluster: ['all', 'manage'],
                indices: [
                  {
                    names: ['foo*'],
                    privileges: ['all'],
                    field_security: { except: ['f'], grant: ['b*'] },
                  },
                ],
                run_as: ['elastic'],
              },
              kibana: [{ spaces: ['*'], base: ['all'], feature: {} }],
            },
          })}
        />
      );

      await waitForRender(wrapper);

      expect(wrapper.find(SpaceAwarePrivilegeSection)).toHaveLength(1);
      expect(wrapper.find('[data-test-subj="userCannotManageSpacesCallout"]')).toHaveLength(0);
      expectSaveFormButtons(wrapper);
    });

    it('renders an auth error when not authorized to manage spaces', async () => {
      const wrapper = mountWithIntl(
        <EditRolePage
          {...getProps({
            action: 'edit',
            canManageSpaces: false,
            role: {
              name: 'my custom role',
              metadata: {},
              elasticsearch: { cluster: ['all'], indices: [], run_as: ['*'] },
              kibana: [{ spaces: ['*'], base: ['all'], feature: {} }],
            },
          })}
        />
      );

      await waitForRender(wrapper);

      expect(wrapper.find('[data-test-subj="reservedRoleBadgeTooltip"]')).toHaveLength(0);

      expect(
        wrapper.find('EuiCallOut[data-test-subj="userCannotManageSpacesCallout"]')
      ).toHaveLength(1);

      expect(wrapper.find(SpaceAwarePrivilegeSection)).toHaveLength(1);
      expectSaveFormButtons(wrapper);
    });

    it('renders a partial read-only view when there is a transform error', async () => {
      const wrapper = mountWithIntl(
        <EditRolePage
          {...getProps({
            action: 'edit',
            canManageSpaces: false,
            role: {
              name: 'my custom role',
              metadata: {},
              elasticsearch: { cluster: ['all'], indices: [], run_as: ['*'] },
              kibana: [],
              _transform_error: ['kibana'],
            },
          })}
        />
      );

      await waitForRender(wrapper);

      expect(wrapper.find(TransformErrorSection)).toHaveLength(1);
      expectReadOnlyFormButtons(wrapper);
    });
  });

  it('registers fatal error if features endpoint fails unexpectedly', async () => {
    const error = { response: { status: 500 } };
    const getFeatures = jest.fn().mockRejectedValue(error);
    const props = getProps({ action: 'edit' });
    const wrapper = mountWithIntl(<EditRolePage {...props} getFeatures={getFeatures} />);

    await waitForRender(wrapper);
    expect(props.fatalErrors.add).toHaveBeenLastCalledWith(error);
    expect(wrapper.find(SpaceAwarePrivilegeSection)).toHaveLength(0);
  });

  it('can render if features call is not allowed', async () => {
    const error = { response: { status: 403 } };
    const getFeatures = jest.fn().mockRejectedValue(error);
    const props = getProps({ action: 'edit' });
    const wrapper = mountWithIntl(<EditRolePage {...props} getFeatures={getFeatures} />);

    await waitForRender(wrapper);
    expect(props.fatalErrors.add).not.toHaveBeenCalled();
    expect(wrapper.find(SpaceAwarePrivilegeSection)).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="userCannotManageSpacesCallout"]')).toHaveLength(0);
    expectSaveFormButtons(wrapper);
  });

  it('can render if index patterns are not available', async () => {
    const dataViews = dataViewPluginMocks.createStartContract();
    dataViews.getTitles = jest.fn().mockRejectedValue({ response: { status: 403 } });

    const wrapper = mountWithIntl(
      <EditRolePage {...{ ...getProps({ action: 'edit' }), dataViews }} />
    );

    await waitForRender(wrapper);

    expect(wrapper.find(SpaceAwarePrivilegeSection)).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="userCannotManageSpacesCallout"]')).toHaveLength(0);
    expectSaveFormButtons(wrapper);
  });
});

async function waitForRender(wrapper: ReactWrapper<any>) {
  await act(async () => {
    await nextTick();
    wrapper.update();
  });
}

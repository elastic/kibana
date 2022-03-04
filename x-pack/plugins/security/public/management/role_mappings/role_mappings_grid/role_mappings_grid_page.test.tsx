/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import { act } from '@testing-library/react';
import React from 'react';

import { findTestSubject, mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import type { CoreStart } from 'src/core/public';
import { coreMock, scopedHistoryMock } from 'src/core/public/mocks';
import { KibanaContextProvider } from 'src/plugins/kibana_react/public';

import { rolesAPIClientMock } from '../../roles/index.mock';
import { NoCompatibleRealms, PermissionDenied, SectionLoading } from '../components';
import { roleMappingsAPIClientMock } from '../role_mappings_api_client.mock';
import { EmptyPrompt } from './empty_prompt';
import { RoleMappingsGridPage } from './role_mappings_grid_page';

describe('RoleMappingsGridPage', () => {
  let history: ReturnType<typeof scopedHistoryMock.create>;
  let coreStart: CoreStart;

  const renderView = (
    roleMappingsAPI: ReturnType<typeof roleMappingsAPIClientMock.create>,
    rolesAPI: ReturnType<typeof rolesAPIClientMock.create> = rolesAPIClientMock.create()
  ) => {
    return mountWithIntl(
      <KibanaContextProvider services={coreStart}>
        <RoleMappingsGridPage
          rolesAPIClient={rolesAPI}
          roleMappingsAPI={roleMappingsAPI}
          notifications={coreStart.notifications}
          docLinks={coreStart.docLinks}
          history={history}
          navigateToApp={coreStart.application.navigateToApp}
        />
      </KibanaContextProvider>
    );
  };

  beforeEach(() => {
    history = scopedHistoryMock.create();
    history.createHref.mockImplementation((location) => location.pathname!);
    coreStart = coreMock.createStart();
  });

  it('renders an empty prompt when no role mappings exist', async () => {
    const roleMappingsAPI = roleMappingsAPIClientMock.create();
    roleMappingsAPI.getRoleMappings.mockResolvedValue([]);
    roleMappingsAPI.checkRoleMappingFeatures.mockResolvedValue({
      canManageRoleMappings: true,
      hasCompatibleRealms: true,
    });

    const wrapper = renderView(roleMappingsAPI);
    expect(wrapper.find(SectionLoading)).toHaveLength(1);
    expect(wrapper.find(EmptyPrompt)).toHaveLength(0);

    await nextTick();
    wrapper.update();

    expect(wrapper.find(SectionLoading)).toHaveLength(0);
    expect(wrapper.find(NoCompatibleRealms)).toHaveLength(0);
    expect(wrapper.find(EmptyPrompt)).toHaveLength(1);
  });

  it('renders a permission denied message when unauthorized to manage role mappings', async () => {
    const roleMappingsAPI = roleMappingsAPIClientMock.create();
    roleMappingsAPI.checkRoleMappingFeatures.mockResolvedValue({
      canManageRoleMappings: false,
      hasCompatibleRealms: true,
    });

    const wrapper = renderView(roleMappingsAPI);
    expect(wrapper.find(SectionLoading)).toHaveLength(1);
    expect(wrapper.find(PermissionDenied)).toHaveLength(0);

    await nextTick();
    wrapper.update();

    expect(wrapper.find(SectionLoading)).toHaveLength(0);
    expect(wrapper.find(NoCompatibleRealms)).toHaveLength(0);
    expect(wrapper.find(PermissionDenied)).toHaveLength(1);
  });

  it('renders a warning when there are no compatible realms enabled', async () => {
    const roleMappingsAPI = roleMappingsAPIClientMock.create();
    roleMappingsAPI.getRoleMappings.mockResolvedValue([
      {
        name: 'some realm',
        enabled: true,
        roles: [],
        rules: { field: { username: '*' } },
      },
    ]);
    roleMappingsAPI.checkRoleMappingFeatures.mockResolvedValue({
      canManageRoleMappings: true,
      hasCompatibleRealms: false,
    });

    const wrapper = renderView(roleMappingsAPI);
    expect(wrapper.find(SectionLoading)).toHaveLength(1);
    expect(wrapper.find(NoCompatibleRealms)).toHaveLength(0);

    await nextTick();
    wrapper.update();

    expect(wrapper.find(SectionLoading)).toHaveLength(0);
    expect(wrapper.find(NoCompatibleRealms)).toHaveLength(1);
  });

  it('renders links to mapped roles, even if the roles API call returns nothing', async () => {
    const roleMappingsAPI = roleMappingsAPIClientMock.create();
    roleMappingsAPI.getRoleMappings.mockResolvedValue([
      {
        name: 'some realm',
        enabled: true,
        roles: ['superuser'],
        rules: { field: { username: '*' } },
      },
    ]);
    roleMappingsAPI.checkRoleMappingFeatures.mockResolvedValue({
      canManageRoleMappings: true,
      hasCompatibleRealms: true,
    });

    const wrapper = renderView(roleMappingsAPI);
    await nextTick();
    wrapper.update();

    const links = findTestSubject(wrapper, 'roleMappingRoles').find(EuiLink);
    expect(links).toHaveLength(1);
    expect(links.at(0).props().onClick).toBeDefined();
  });

  it('describes the number of mapped role templates', async () => {
    const roleMappingsAPI = roleMappingsAPIClientMock.create();
    roleMappingsAPI.getRoleMappings.mockResolvedValue([
      {
        name: 'some realm',
        enabled: true,
        role_templates: [{}, {}],
        rules: { field: { username: '*' } },
      },
    ]);
    roleMappingsAPI.checkRoleMappingFeatures.mockResolvedValue({
      canManageRoleMappings: true,
      hasCompatibleRealms: true,
    });

    const wrapper = renderView(roleMappingsAPI);
    await nextTick();
    wrapper.update();

    const templates = findTestSubject(wrapper, 'roleMappingRoles');
    expect(templates).toHaveLength(1);
    expect(templates.text()).toEqual(`2 role templates defined`);
  });

  it('allows role mappings to be deleted, refreshing the grid after', async () => {
    const roleMappingsAPI = roleMappingsAPIClientMock.create();
    roleMappingsAPI.getRoleMappings.mockResolvedValue([
      {
        name: 'some-realm',
        enabled: true,
        roles: ['superuser'],
        rules: { field: { username: '*' } },
      },
    ]);
    roleMappingsAPI.checkRoleMappingFeatures.mockResolvedValue({
      canManageRoleMappings: true,
      hasCompatibleRealms: true,
    });
    roleMappingsAPI.deleteRoleMappings.mockResolvedValue([
      {
        name: 'some-realm',
        success: true,
      },
    ]);

    const wrapper = renderView(roleMappingsAPI);
    await nextTick();
    wrapper.update();

    expect(roleMappingsAPI.getRoleMappings).toHaveBeenCalledTimes(1);
    expect(roleMappingsAPI.deleteRoleMappings).not.toHaveBeenCalled();

    findTestSubject(wrapper, `euiCollapsedItemActionsButton`).simulate('click');
    findTestSubject(wrapper, `deleteRoleMappingButton-some-realm`).simulate('click');
    expect(findTestSubject(wrapper, 'deleteRoleMappingConfirmationModal')).toHaveLength(1);

    await act(async () => {
      findTestSubject(wrapper, 'confirmModalConfirmButton').simulate('click');
      await nextTick();
      wrapper.update();
    });

    expect(roleMappingsAPI.deleteRoleMappings).toHaveBeenCalledWith(['some-realm']);
    // Expect an additional API call to refresh the grid
    expect(roleMappingsAPI.getRoleMappings).toHaveBeenCalledTimes(2);
  });

  it('renders a warning when a mapping is assigned a deprecated role', async () => {
    const roleMappingsAPI = roleMappingsAPIClientMock.create();
    roleMappingsAPI.getRoleMappings.mockResolvedValue([
      {
        name: 'some-realm',
        enabled: true,
        roles: ['superuser', 'kibana_user'],
        rules: { field: { username: '*' } },
      },
    ]);
    roleMappingsAPI.checkRoleMappingFeatures.mockResolvedValue({
      canManageRoleMappings: true,
      hasCompatibleRealms: true,
    });
    roleMappingsAPI.deleteRoleMappings.mockResolvedValue([
      {
        name: 'some-realm',
        success: true,
      },
    ]);

    const roleAPIClient = rolesAPIClientMock.create();
    roleAPIClient.getRoles.mockResolvedValue([
      {
        name: 'kibana_user',
        metadata: {
          _deprecated: true,
          _deprecated_reason: `I don't like you.`,
        },
      },
    ]);

    const wrapper = renderView(roleMappingsAPI, roleAPIClient);
    await nextTick();
    wrapper.update();

    const deprecationTooltip = wrapper
      .find('[data-test-subj="roleDeprecationTooltip"]')
      .prop('content');

    expect(deprecationTooltip).toMatchInlineSnapshot(
      `"The kibana_user role is deprecated. I don't like you."`
    );
  });

  it('renders role mapping actions as appropriate', async () => {
    const roleMappingsAPI = roleMappingsAPIClientMock.create();
    roleMappingsAPI.getRoleMappings.mockResolvedValue([
      {
        name: 'some-realm',
        enabled: true,
        roles: ['superuser'],
        rules: { field: { username: '*' } },
      },
    ]);
    roleMappingsAPI.checkRoleMappingFeatures.mockResolvedValue({
      canManageRoleMappings: true,
      hasCompatibleRealms: true,
    });
    roleMappingsAPI.deleteRoleMappings.mockResolvedValue([
      {
        name: 'some-realm',
        success: true,
      },
    ]);

    const wrapper = renderView(roleMappingsAPI);
    await nextTick();
    wrapper.update();

    const editButton = wrapper.find(
      'EuiButtonEmpty[data-test-subj="editRoleMappingButton-some-realm"]'
    );
    expect(editButton).toHaveLength(1);
    expect(editButton.prop('href')).toBe('/edit/some-realm');

    const cloneButton = wrapper.find(
      'EuiButtonEmpty[data-test-subj="cloneRoleMappingButton-some-realm"]'
    );
    expect(cloneButton).toHaveLength(1);
    expect(cloneButton.prop('href')).toBe('/clone/some-realm');

    const actionMenuButton = wrapper.find(
      'EuiButtonIcon[data-test-subj="euiCollapsedItemActionsButton"]'
    );
    expect(actionMenuButton).toHaveLength(1);

    actionMenuButton.simulate('click');
    wrapper.update();

    const deleteButton = wrapper.find(
      'EuiButtonEmpty[data-test-subj="deleteRoleMappingButton-some-realm"]'
    );
    expect(deleteButton).toHaveLength(1);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mountWithIntl, nextTick } from 'test_utils/enzyme_helpers';
import { RoleMappingsGridPage } from '.';
import { SectionLoading, PermissionDenied, NoCompatibleRealms } from '../components';
import { EmptyPrompt } from './empty_prompt';
import { findTestSubject } from 'test_utils/find_test_subject';
import { EuiLink } from '@elastic/eui';
import { act } from '@testing-library/react';
import { DocumentationLinksService } from '../documentation_links';

import { coreMock } from '../../../../../../../src/core/public/mocks';
import { roleMappingsAPIClientMock } from '../role_mappings_api_client.mock';
import { rolesAPIClientMock } from '../../roles/index.mock';
import { RoleTableDisplay } from '../../role_table_display';

describe('RoleMappingsGridPage', () => {
  it('renders an empty prompt when no role mappings exist', async () => {
    const roleMappingsAPI = roleMappingsAPIClientMock.create();
    roleMappingsAPI.getRoleMappings.mockResolvedValue([]);
    roleMappingsAPI.checkRoleMappingFeatures.mockResolvedValue({
      canManageRoleMappings: true,
      hasCompatibleRealms: true,
    });

    const { docLinks, notifications } = coreMock.createStart();
    const wrapper = mountWithIntl(
      <RoleMappingsGridPage
        rolesAPIClient={rolesAPIClientMock.create()}
        roleMappingsAPI={roleMappingsAPI}
        notifications={notifications}
        docLinks={new DocumentationLinksService(docLinks)}
      />
    );
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

    const { docLinks, notifications } = coreMock.createStart();
    const wrapper = mountWithIntl(
      <RoleMappingsGridPage
        rolesAPIClient={rolesAPIClientMock.create()}
        roleMappingsAPI={roleMappingsAPI}
        notifications={notifications}
        docLinks={new DocumentationLinksService(docLinks)}
      />
    );
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

    const { docLinks, notifications } = coreMock.createStart();
    const wrapper = mountWithIntl(
      <RoleMappingsGridPage
        rolesAPIClient={rolesAPIClientMock.create()}
        roleMappingsAPI={roleMappingsAPI}
        notifications={notifications}
        docLinks={new DocumentationLinksService(docLinks)}
      />
    );
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

    const { docLinks, notifications } = coreMock.createStart();
    const wrapper = mountWithIntl(
      <RoleMappingsGridPage
        rolesAPIClient={rolesAPIClientMock.create()}
        roleMappingsAPI={roleMappingsAPI}
        notifications={notifications}
        docLinks={new DocumentationLinksService(docLinks)}
      />
    );
    await nextTick();
    wrapper.update();

    const links = findTestSubject(wrapper, 'roleMappingRoles').find(EuiLink);
    expect(links).toHaveLength(1);
    expect(links.at(0).props()).toMatchObject({
      href: '#/management/security/roles/edit/superuser',
    });
  });

  it('renders deprecated roles as such', async () => {
    const roleMappingsAPI = roleMappingsAPIClientMock.create();
    roleMappingsAPI.getRoleMappings.mockResolvedValue([
      {
        name: 'some realm',
        enabled: true,
        roles: ['superuser', 'some_deprecated_role'],
        rules: { field: { username: '*' } },
      },
    ]);
    roleMappingsAPI.checkRoleMappingFeatures.mockResolvedValue({
      canManageRoleMappings: true,
      hasCompatibleRealms: true,
    });

    const rolesAPI = rolesAPIClientMock.create();
    rolesAPI.getRoles.mockResolvedValue([
      {
        name: 'some_deprecated_role',
        metadata: { _deprecated: true, _deprecated_reason: 'because I said so' },
      },
    ]);

    const { docLinks, notifications } = coreMock.createStart();
    const wrapper = mountWithIntl(
      <RoleMappingsGridPage
        rolesAPIClient={rolesAPI}
        roleMappingsAPI={roleMappingsAPI}
        notifications={notifications}
        docLinks={new DocumentationLinksService(docLinks)}
      />
    );
    await nextTick();
    wrapper.update();

    const roles = findTestSubject(wrapper, 'roleMappingRoles').find(RoleTableDisplay);
    expect(roles).toHaveLength(2);
    expect(roles.at(0).props().role).toEqual('superuser');
    expect(roles.at(0).find('EuiLink[color="warning"]')).toHaveLength(0);

    expect(roles.at(1).find('EuiLink[color="warning"]')).toHaveLength(1);
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

    const { docLinks, notifications } = coreMock.createStart();
    const wrapper = mountWithIntl(
      <RoleMappingsGridPage
        rolesAPIClient={rolesAPIClientMock.create()}
        roleMappingsAPI={roleMappingsAPI}
        notifications={notifications}
        docLinks={new DocumentationLinksService(docLinks)}
      />
    );
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

    const { docLinks, notifications } = coreMock.createStart();
    const wrapper = mountWithIntl(
      <RoleMappingsGridPage
        rolesAPIClient={rolesAPIClientMock.create()}
        roleMappingsAPI={roleMappingsAPI}
        notifications={notifications}
        docLinks={new DocumentationLinksService(docLinks)}
      />
    );
    await nextTick();
    wrapper.update();

    expect(roleMappingsAPI.getRoleMappings).toHaveBeenCalledTimes(1);
    expect(roleMappingsAPI.deleteRoleMappings).not.toHaveBeenCalled();

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
});

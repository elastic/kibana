/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// brace/ace uses the Worker class, which is not currently provided by JSDOM.
// This is not required for the tests to pass, but it rather suppresses lengthy
// warnings in the console which adds unnecessary noise to the test output.
import '@kbn/test-jest-helpers/target_node/stub_web_worker';

import React from 'react';

import { coreMock, scopedHistoryMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { findTestSubject, mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import type { PublicMethodsOf } from '@kbn/utility-types';

import type { Role } from '../../../../common/model';
import { RoleComboBox } from '../../role_combo_box';
import type { RolesAPIClient } from '../../roles';
import { rolesAPIClientMock } from '../../roles/roles_api_client.mock';
import { NoCompatibleRealms, PermissionDenied, SectionLoading } from '../components';
import { roleMappingsAPIClientMock } from '../role_mappings_api_client.mock';
import { EditRoleMappingPage } from './edit_role_mapping_page';
import { JSONRuleEditor } from './rule_editor_panel/json_rule_editor';
import { VisualRuleEditor } from './rule_editor_panel/visual_rule_editor';

describe('EditRoleMappingPage', () => {
  const history = scopedHistoryMock.create();
  let rolesAPI: PublicMethodsOf<RolesAPIClient>;

  const renderView = (
    roleMappingsAPI: ReturnType<typeof roleMappingsAPIClientMock.create>,
    name?: string
  ) => {
    const coreStart = coreMock.createStart();
    return mountWithIntl(
      <KibanaContextProvider services={coreStart}>
        <EditRoleMappingPage
          action="edit"
          name={name}
          roleMappingsAPI={roleMappingsAPI}
          rolesAPIClient={rolesAPI}
          notifications={coreStart.notifications}
          docLinks={coreStart.docLinks}
          history={history}
        />
      </KibanaContextProvider>
    );
  };

  beforeEach(() => {
    rolesAPI = rolesAPIClientMock.create();
    (rolesAPI as jest.Mocked<RolesAPIClient>).getRoles.mockResolvedValue([
      { name: 'foo_role' },
      { name: 'bar role' },
      { name: 'some-deprecated-role', metadata: { _deprecated: true } },
    ] as Role[]);
  });

  it('allows a role mapping to be created', async () => {
    const roleMappingsAPI = roleMappingsAPIClientMock.create();
    roleMappingsAPI.saveRoleMapping.mockResolvedValue(null);
    roleMappingsAPI.checkRoleMappingFeatures.mockResolvedValue({
      canManageRoleMappings: true,
      hasCompatibleRealms: true,
      canUseInlineScripts: true,
      canUseStoredScripts: true,
    });

    const wrapper = renderView(roleMappingsAPI);
    await nextTick();
    wrapper.update();

    findTestSubject(wrapper, 'roleMappingFormNameInput').simulate('change', {
      target: { value: 'my-role-mapping' },
    });

    wrapper.find(RoleComboBox).props().onChange(['foo_role']);

    findTestSubject(wrapper, 'roleMappingsAddRuleButton').simulate('click');

    findTestSubject(wrapper, 'saveRoleMappingButton').simulate('click');

    expect(roleMappingsAPI.saveRoleMapping).toHaveBeenCalledWith({
      name: 'my-role-mapping',
      enabled: true,
      roles: ['foo_role'],
      role_templates: [],
      rules: {
        all: [{ field: { username: '*' } }],
      },
      metadata: {},
    });
  });

  it('allows a role mapping to be updated', async () => {
    const roleMappingsAPI = roleMappingsAPIClientMock.create();
    roleMappingsAPI.saveRoleMapping.mockResolvedValue(null);
    roleMappingsAPI.getRoleMapping.mockResolvedValue({
      name: 'foo',
      role_templates: [
        {
          template: { id: 'foo' },
        },
      ],
      enabled: true,
      rules: {
        any: [{ field: { 'metadata.someCustomOption': [false, true, 'asdf'] } }],
      },
      metadata: {
        foo: 'bar',
        bar: 'baz',
      },
    });
    roleMappingsAPI.checkRoleMappingFeatures.mockResolvedValue({
      canManageRoleMappings: true,
      hasCompatibleRealms: true,
      canUseInlineScripts: true,
      canUseStoredScripts: true,
    });

    const wrapper = renderView(roleMappingsAPI, 'foo');
    await nextTick();
    wrapper.update();

    findTestSubject(wrapper, 'switchToRolesButton').simulate('click');

    wrapper.find(RoleComboBox).props().onChange(['foo_role']);

    findTestSubject(wrapper, 'roleMappingsAddRuleButton').simulate('click');
    wrapper.find('button[id="addRuleOption"]').simulate('click');

    findTestSubject(wrapper, 'saveRoleMappingButton').simulate('click');

    expect(roleMappingsAPI.saveRoleMapping).toHaveBeenCalledWith({
      name: 'foo',
      enabled: true,
      roles: ['foo_role'],
      role_templates: [],
      rules: {
        any: [
          { field: { 'metadata.someCustomOption': [false, true, 'asdf'] } },
          { field: { username: '*' } },
        ],
      },
      metadata: {
        foo: 'bar',
        bar: 'baz',
      },
    });
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

  it('renders a message when editing a mapping with deprecated roles assigned', async () => {
    const roleMappingsAPI = roleMappingsAPIClientMock.create();
    roleMappingsAPI.getRoleMapping.mockResolvedValue({
      name: 'foo',
      roles: ['some-deprecated-role'],
      enabled: true,
      rules: {
        field: { username: '*' },
      },
    });
    roleMappingsAPI.checkRoleMappingFeatures.mockResolvedValue({
      canManageRoleMappings: true,
      hasCompatibleRealms: true,
      canUseInlineScripts: true,
      canUseStoredScripts: true,
    });

    const wrapper = renderView(roleMappingsAPI, 'foo');
    expect(findTestSubject(wrapper, 'deprecatedRolesAssigned')).toHaveLength(0);

    await nextTick();
    wrapper.update();

    expect(findTestSubject(wrapper, 'deprecatedRolesAssigned')).toHaveLength(1);
  });

  it('renders a warning when editing a mapping with a stored role template, when stored scripts are disabled', async () => {
    const roleMappingsAPI = roleMappingsAPIClientMock.create();
    roleMappingsAPI.getRoleMapping.mockResolvedValue({
      name: 'foo',
      role_templates: [
        {
          template: { id: 'foo' },
        },
      ],
      enabled: true,
      rules: {
        field: { username: '*' },
      },
    });
    roleMappingsAPI.checkRoleMappingFeatures.mockResolvedValue({
      canManageRoleMappings: true,
      hasCompatibleRealms: true,
      canUseInlineScripts: true,
      canUseStoredScripts: false,
    });

    const wrapper = renderView(roleMappingsAPI, 'foo');
    expect(findTestSubject(wrapper, 'roleMappingInlineScriptsDisabled')).toHaveLength(0);
    expect(findTestSubject(wrapper, 'roleMappingStoredScriptsDisabled')).toHaveLength(0);

    await nextTick();
    wrapper.update();

    expect(findTestSubject(wrapper, 'roleMappingInlineScriptsDisabled')).toHaveLength(0);
    expect(findTestSubject(wrapper, 'roleMappingStoredScriptsDisabled')).toHaveLength(1);
  });

  it('renders a warning when editing a mapping with an inline role template, when inline scripts are disabled', async () => {
    const roleMappingsAPI = roleMappingsAPIClientMock.create();
    roleMappingsAPI.getRoleMapping.mockResolvedValue({
      name: 'foo',
      role_templates: [
        {
          template: { source: 'foo' },
        },
      ],
      enabled: true,
      rules: {
        field: { username: '*' },
      },
    });
    roleMappingsAPI.checkRoleMappingFeatures.mockResolvedValue({
      canManageRoleMappings: true,
      hasCompatibleRealms: true,
      canUseInlineScripts: false,
      canUseStoredScripts: true,
    });

    const wrapper = renderView(roleMappingsAPI, 'foo');
    expect(findTestSubject(wrapper, 'roleMappingInlineScriptsDisabled')).toHaveLength(0);
    expect(findTestSubject(wrapper, 'roleMappingStoredScriptsDisabled')).toHaveLength(0);

    await nextTick();
    wrapper.update();

    expect(findTestSubject(wrapper, 'roleMappingInlineScriptsDisabled')).toHaveLength(1);
    expect(findTestSubject(wrapper, 'roleMappingStoredScriptsDisabled')).toHaveLength(0);
  });

  it('renders the visual editor by default for simple rule sets', async () => {
    const roleMappingsAPI = roleMappingsAPIClientMock.create();
    roleMappingsAPI.getRoleMapping.mockResolvedValue({
      name: 'foo',
      roles: ['superuser'],
      enabled: true,
      rules: {
        all: [
          {
            field: {
              username: '*',
            },
          },
          {
            field: {
              dn: null,
            },
          },
          {
            field: {
              realm: ['ldap', 'pki', null, 12],
            },
          },
        ],
      },
    });
    roleMappingsAPI.checkRoleMappingFeatures.mockResolvedValue({
      canManageRoleMappings: true,
      hasCompatibleRealms: true,
      canUseInlineScripts: true,
      canUseStoredScripts: true,
    });

    const wrapper = renderView(roleMappingsAPI, 'foo');
    await nextTick();
    wrapper.update();

    expect(wrapper.find(VisualRuleEditor)).toHaveLength(1);
    expect(wrapper.find(JSONRuleEditor)).toHaveLength(0);
  });

  it('renders the JSON editor by default for complex rule sets', async () => {
    const createRule = (depth: number): Record<string, any> => {
      if (depth > 0) {
        const rule = {
          all: [
            {
              field: {
                username: '*',
              },
            },
          ],
        } as Record<string, any>;

        const subRule = createRule(depth - 1);
        if (subRule) {
          rule.all.push(subRule);
        }

        return rule;
      }
      return null as any;
    };

    const roleMappingsAPI = roleMappingsAPIClientMock.create();
    roleMappingsAPI.getRoleMapping.mockResolvedValue({
      name: 'foo',
      roles: ['superuser'],
      enabled: true,
      rules: createRule(10),
    });
    roleMappingsAPI.checkRoleMappingFeatures.mockResolvedValue({
      canManageRoleMappings: true,
      hasCompatibleRealms: true,
      canUseInlineScripts: true,
      canUseStoredScripts: true,
    });

    const wrapper = renderView(roleMappingsAPI, 'foo');
    await nextTick();
    wrapper.update();

    expect(wrapper.find(VisualRuleEditor)).toHaveLength(0);
    expect(wrapper.find(JSONRuleEditor)).toHaveLength(1);
  });
});

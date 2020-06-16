/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mountWithIntl, nextTick } from 'test_utils/enzyme_helpers';
import { findTestSubject } from 'test_utils/find_test_subject';

// brace/ace uses the Worker class, which is not currently provided by JSDOM.
// This is not required for the tests to pass, but it rather suppresses lengthy
// warnings in the console which adds unnecessary noise to the test output.
import 'test_utils/stub_web_worker';
import { ScopedHistory } from 'kibana/public';

import { EditRoleMappingPage } from '.';
import { NoCompatibleRealms, SectionLoading, PermissionDenied } from '../components';
import { VisualRuleEditor } from './rule_editor_panel/visual_rule_editor';
import { JSONRuleEditor } from './rule_editor_panel/json_rule_editor';
import { RolesAPIClient } from '../../roles';
import { Role } from '../../../../common/model';
import { DocumentationLinksService } from '../documentation_links';

import { coreMock, scopedHistoryMock } from '../../../../../../../src/core/public/mocks';
import { roleMappingsAPIClientMock } from '../role_mappings_api_client.mock';
import { rolesAPIClientMock } from '../../roles/roles_api_client.mock';
import { RoleComboBox } from '../../role_combo_box';

describe('EditRoleMappingPage', () => {
  const history = (scopedHistoryMock.create() as unknown) as ScopedHistory;
  let rolesAPI: PublicMethodsOf<RolesAPIClient>;

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

    const { docLinks, notifications } = coreMock.createStart();
    const wrapper = mountWithIntl(
      <EditRoleMappingPage
        roleMappingsAPI={roleMappingsAPI}
        rolesAPIClient={rolesAPI}
        notifications={notifications}
        docLinks={new DocumentationLinksService(docLinks)}
        history={history}
      />
    );

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

    const { docLinks, notifications } = coreMock.createStart();
    const wrapper = mountWithIntl(
      <EditRoleMappingPage
        name="foo"
        roleMappingsAPI={roleMappingsAPI}
        rolesAPIClient={rolesAPI}
        notifications={notifications}
        docLinks={new DocumentationLinksService(docLinks)}
        history={history}
      />
    );

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

    const { docLinks, notifications } = coreMock.createStart();
    const wrapper = mountWithIntl(
      <EditRoleMappingPage
        roleMappingsAPI={roleMappingsAPI}
        rolesAPIClient={rolesAPI}
        notifications={notifications}
        docLinks={new DocumentationLinksService(docLinks)}
        history={history}
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
    roleMappingsAPI.checkRoleMappingFeatures.mockResolvedValue({
      canManageRoleMappings: true,
      hasCompatibleRealms: false,
    });

    const { docLinks, notifications } = coreMock.createStart();
    const wrapper = mountWithIntl(
      <EditRoleMappingPage
        roleMappingsAPI={roleMappingsAPI}
        rolesAPIClient={rolesAPI}
        notifications={notifications}
        docLinks={new DocumentationLinksService(docLinks)}
        history={history}
      />
    );
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

    const { docLinks, notifications } = coreMock.createStart();
    const wrapper = mountWithIntl(
      <EditRoleMappingPage
        name={'foo'}
        roleMappingsAPI={roleMappingsAPI}
        rolesAPIClient={rolesAPI}
        notifications={notifications}
        docLinks={new DocumentationLinksService(docLinks)}
        history={history}
      />
    );

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

    const { docLinks, notifications } = coreMock.createStart();
    const wrapper = mountWithIntl(
      <EditRoleMappingPage
        name={'foo'}
        roleMappingsAPI={roleMappingsAPI}
        rolesAPIClient={rolesAPI}
        notifications={notifications}
        docLinks={new DocumentationLinksService(docLinks)}
        history={history}
      />
    );

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

    const { docLinks, notifications } = coreMock.createStart();
    const wrapper = mountWithIntl(
      <EditRoleMappingPage
        name={'foo'}
        roleMappingsAPI={roleMappingsAPI}
        rolesAPIClient={rolesAPI}
        notifications={notifications}
        docLinks={new DocumentationLinksService(docLinks)}
        history={history}
      />
    );

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

    const { docLinks, notifications } = coreMock.createStart();
    const wrapper = mountWithIntl(
      <EditRoleMappingPage
        name={'foo'}
        roleMappingsAPI={roleMappingsAPI}
        rolesAPIClient={rolesAPI}
        notifications={notifications}
        docLinks={new DocumentationLinksService(docLinks)}
        history={history}
      />
    );

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

    const { docLinks, notifications } = coreMock.createStart();
    const wrapper = mountWithIntl(
      <EditRoleMappingPage
        name={'foo'}
        roleMappingsAPI={roleMappingsAPI}
        rolesAPIClient={rolesAPI}
        notifications={notifications}
        docLinks={new DocumentationLinksService(docLinks)}
        history={history}
      />
    );

    await nextTick();
    wrapper.update();

    expect(wrapper.find(VisualRuleEditor)).toHaveLength(0);
    expect(wrapper.find(JSONRuleEditor)).toHaveLength(1);
  });
});

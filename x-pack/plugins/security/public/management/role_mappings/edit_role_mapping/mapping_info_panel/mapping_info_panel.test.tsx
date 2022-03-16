/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { findTestSubject, mountWithIntl } from '@kbn/test-jest-helpers';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { coreMock } from 'src/core/public/mocks';

import type { Role, RoleMapping } from '../../../../../common/model';
import type { RolesAPIClient } from '../../../roles';
import { rolesAPIClientMock } from '../../../roles/roles_api_client.mock';
import { RoleSelector } from '../role_selector';
import { RoleTemplateEditor } from '../role_selector/role_template_editor';
import { MappingInfoPanel } from './mapping_info_panel';

describe('MappingInfoPanel', () => {
  let rolesAPI: PublicMethodsOf<RolesAPIClient>;
  beforeEach(() => {
    rolesAPI = rolesAPIClientMock.create();
    (rolesAPI as jest.Mocked<RolesAPIClient>).getRoles.mockResolvedValue([
      { name: 'foo_role' },
      { name: 'bar role' },
    ] as Role[]);
  });

  it('renders when creating a role mapping, default to the "roles" view', () => {
    const props = {
      roleMapping: {
        name: 'my role mapping',
        enabled: true,
        roles: [],
        role_templates: [],
        rules: {},
        metadata: {},
      } as RoleMapping,
      mode: 'create',
      docLinks: coreMock.createStart().docLinks,
      rolesAPIClient: rolesAPI,
    } as MappingInfoPanel['props'];

    const wrapper = mountWithIntl(<MappingInfoPanel {...props} />);

    // Name input validation
    const { value: nameInputValue, readOnly: nameInputReadOnly } = findTestSubject(
      wrapper,
      'roleMappingFormNameInput'
    )
      .find('input')
      .props();

    expect(nameInputValue).toEqual(props.roleMapping.name);
    expect(nameInputReadOnly).toEqual(false);

    // Enabled switch validation
    const { checked: enabledInputValue } = wrapper
      .find('EuiSwitch[data-test-subj="roleMappingsEnabledSwitch"]')
      .props();

    expect(enabledInputValue).toEqual(props.roleMapping.enabled);

    // Verify "roles" mode
    expect(wrapper.find(RoleSelector).props()).toMatchObject({
      mode: 'roles',
    });
  });

  it('renders the role templates view if templates are provided', () => {
    const props = {
      roleMapping: {
        name: 'my role mapping',
        enabled: true,
        roles: [],
        role_templates: [
          {
            template: {
              source: '',
            },
          },
        ],
        rules: {},
        metadata: {},
      } as RoleMapping,
      mode: 'edit',
      docLinks: coreMock.createStart().docLinks,
      rolesAPIClient: rolesAPI,
    } as MappingInfoPanel['props'];

    const wrapper = mountWithIntl(<MappingInfoPanel {...props} />);

    expect(wrapper.find(RoleSelector).props()).toMatchObject({
      mode: 'templates',
    });
  });

  it('renders a blank inline template by default when switching from roles to role templates', () => {
    const props = {
      roleMapping: {
        name: 'my role mapping',
        enabled: true,
        roles: ['foo_role'],
        role_templates: [],
        rules: {},
        metadata: {},
      } as RoleMapping,
      mode: 'create' as any,
      onChange: jest.fn(),
      canUseInlineScripts: true,
      canUseStoredScripts: false,
      validateForm: false,
      docLinks: coreMock.createStart().docLinks,
      rolesAPIClient: rolesAPI,
    };

    const wrapper = mountWithIntl(<MappingInfoPanel {...props} />);

    findTestSubject(wrapper, 'switchToRoleTemplatesButton').simulate('click');

    expect(props.onChange).toHaveBeenCalledWith({
      name: 'my role mapping',
      enabled: true,
      roles: [],
      role_templates: [
        {
          template: { source: '' },
        },
      ],
      rules: {},
      metadata: {},
    });

    wrapper.setProps({ roleMapping: props.onChange.mock.calls[0][0] });

    expect(wrapper.find(RoleTemplateEditor)).toHaveLength(1);
  });

  it('renders a blank stored template by default when switching from roles to role templates and inline scripts are disabled', () => {
    const props = {
      roleMapping: {
        name: 'my role mapping',
        enabled: true,
        roles: ['foo_role'],
        role_templates: [],
        rules: {},
        metadata: {},
      } as RoleMapping,
      mode: 'create' as any,
      onChange: jest.fn(),
      canUseInlineScripts: false,
      canUseStoredScripts: true,
      validateForm: false,
      docLinks: coreMock.createStart().docLinks,
      rolesAPIClient: rolesAPI,
    };

    const wrapper = mountWithIntl(<MappingInfoPanel {...props} />);

    findTestSubject(wrapper, 'switchToRoleTemplatesButton').simulate('click');

    expect(props.onChange).toHaveBeenCalledWith({
      name: 'my role mapping',
      enabled: true,
      roles: [],
      role_templates: [
        {
          template: { id: '' },
        },
      ],
      rules: {},
      metadata: {},
    });

    wrapper.setProps({ roleMapping: props.onChange.mock.calls[0][0] });

    expect(wrapper.find(RoleTemplateEditor)).toHaveLength(1);
  });

  it('does not create a blank role template if no script types are enabled', () => {
    const props = {
      roleMapping: {
        name: 'my role mapping',
        enabled: true,
        roles: ['foo_role'],
        role_templates: [],
        rules: {},
        metadata: {},
      } as RoleMapping,
      mode: 'create' as any,
      onChange: jest.fn(),
      canUseInlineScripts: false,
      canUseStoredScripts: false,
      validateForm: false,
      docLinks: coreMock.createStart().docLinks,
      rolesAPIClient: rolesAPI,
    };

    const wrapper = mountWithIntl(<MappingInfoPanel {...props} />);

    findTestSubject(wrapper, 'switchToRoleTemplatesButton').simulate('click');

    wrapper.update();

    expect(props.onChange).not.toHaveBeenCalled();
    expect(wrapper.find(RoleTemplateEditor)).toHaveLength(0);
  });

  it('renders the name input as readonly when editing an existing role mapping', () => {
    const props = {
      roleMapping: {
        name: 'my role mapping',
        enabled: true,
        roles: [],
        role_templates: [],
        rules: {},
        metadata: {},
      } as RoleMapping,
      mode: 'edit',
      docLinks: coreMock.createStart().docLinks,
      rolesAPIClient: rolesAPI,
    } as MappingInfoPanel['props'];

    const wrapper = mountWithIntl(<MappingInfoPanel {...props} />);

    // Name input validation
    const { value: nameInputValue, readOnly: nameInputReadOnly } = findTestSubject(
      wrapper,
      'roleMappingFormNameInput'
    )
      .find('input')
      .props();

    expect(nameInputValue).toEqual(props.roleMapping.name);
    expect(nameInputReadOnly).toEqual(true);
  });
});

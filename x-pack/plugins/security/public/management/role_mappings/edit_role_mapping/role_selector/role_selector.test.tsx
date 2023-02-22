/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox } from '@elastic/eui';
import React from 'react';

import { findTestSubject, mountWithIntl } from '@kbn/test-jest-helpers';
import type { PublicMethodsOf } from '@kbn/utility-types';

import type { Role, RoleMapping } from '../../../../../common/model';
import type { RolesAPIClient } from '../../../roles';
import { rolesAPIClientMock } from '../../../roles/roles_api_client.mock';
import { AddRoleTemplateButton } from './add_role_template_button';
import { RoleSelector } from './role_selector';
import { RoleTemplateEditor } from './role_template_editor';

describe('RoleSelector', () => {
  let rolesAPI: PublicMethodsOf<RolesAPIClient>;
  beforeEach(() => {
    rolesAPI = rolesAPIClientMock.create();
    (rolesAPI as jest.Mocked<RolesAPIClient>).getRoles.mockResolvedValue([
      { name: 'foo_role' },
      { name: 'bar role' },
    ] as Role[]);
  });

  it('allows roles to be selected, removing any previously selected role templates', () => {
    const props = {
      roleMapping: {
        roles: [] as string[],
        role_templates: [
          {
            template: { source: '' },
          },
        ],
      } as RoleMapping,
      canUseStoredScripts: true,
      canUseInlineScripts: true,
      onChange: jest.fn(),
      mode: 'roles',
      rolesAPIClient: rolesAPI,
    } as RoleSelector['props'];

    const wrapper = mountWithIntl(<RoleSelector {...props} />);
    (wrapper.find(EuiComboBox).props() as any).onChange([{ label: 'foo_role' }]);

    expect(props.onChange).toHaveBeenCalledWith({
      roles: ['foo_role'],
      role_templates: [],
    });
  });

  it('allows role templates to be created, removing any previously selected roles', () => {
    const props = {
      roleMapping: {
        roles: ['foo_role'],
        role_templates: [] as any,
      } as RoleMapping,
      canUseStoredScripts: true,
      canUseInlineScripts: true,
      onChange: jest.fn(),
      mode: 'templates',
      rolesAPIClient: rolesAPI,
    } as RoleSelector['props'];

    const wrapper = mountWithIntl(<RoleSelector {...props} />);

    wrapper.find(AddRoleTemplateButton).simulate('click');

    expect(props.onChange).toHaveBeenCalledWith({
      roles: [],
      role_templates: [
        {
          template: { source: '' },
        },
      ],
    });
  });

  it('allows role templates to be edited', () => {
    const props = {
      roleMapping: {
        roles: [] as string[],
        role_templates: [
          {
            template: { source: 'foo_role' },
          },
        ],
      } as RoleMapping,
      canUseStoredScripts: true,
      canUseInlineScripts: true,
      onChange: jest.fn(),
      mode: 'templates',
      rolesAPIClient: rolesAPI,
    } as RoleSelector['props'];

    const wrapper = mountWithIntl(<RoleSelector {...props} />);

    wrapper
      .find(RoleTemplateEditor)
      .props()
      .onChange({
        template: { source: '{{username}}_role' },
      });

    expect(props.onChange).toHaveBeenCalledWith({
      roles: [],
      role_templates: [
        {
          template: { source: '{{username}}_role' },
        },
      ],
    });
  });

  it('allows role templates to be deleted', () => {
    const props = {
      roleMapping: {
        roles: [] as string[],
        role_templates: [
          {
            template: { source: 'foo_role' },
          },
        ],
      } as RoleMapping,
      canUseStoredScripts: true,
      canUseInlineScripts: true,
      onChange: jest.fn(),
      mode: 'templates',
      rolesAPIClient: rolesAPI,
    } as RoleSelector['props'];

    const wrapper = mountWithIntl(<RoleSelector {...props} />);

    findTestSubject(wrapper, 'deleteRoleTemplateButton').simulate('click');

    expect(props.onChange).toHaveBeenCalledWith({
      roles: [],
      role_templates: [],
    });
  });

  describe('can render a readonly view', () => {
    it('in "roles" mode', async () => {
      const props = {
        roleMapping: {
          roles: [] as string[],
          role_templates: [
            {
              template: { source: '' },
            },
          ],
        } as RoleMapping,
        canUseStoredScripts: true,
        canUseInlineScripts: true,
        onChange: jest.fn(),
        mode: 'roles',
        rolesAPIClient: rolesAPI,
        readOnly: true,
      } as RoleSelector['props'];

      const wrapper = mountWithIntl(<RoleSelector {...props} />);

      // Roles combo is disabled
      const { disabled: rolesComboDisabled } = wrapper
        .find('RoleComboBox[data-test-subj="roleMappingFormRolesCombo"]')
        .props();
      expect(rolesComboDisabled).toEqual(true);
    });

    it('in "templates" mode', async () => {
      const props = {
        roleMapping: {
          roles: [] as string[],
          role_templates: [
            {
              template: { source: 'foo_role' },
            },
          ],
        } as RoleMapping,
        canUseStoredScripts: true,
        canUseInlineScripts: true,
        onChange: jest.fn(),
        mode: 'templates',
        rolesAPIClient: rolesAPI,
        readOnly: true,
      } as RoleSelector['props'];

      const wrapper = mountWithIntl(<RoleSelector {...props} />);

      // Any/all role template editors are read-only
      const templateEditors = wrapper.find(
        'RoleTemplateEditor[data-test-subj="roleMappingFormRoleTemplateEditor"]'
      );
      expect(templateEditors).not.toHaveLength(0);
      templateEditors.map((templateEditor) => {
        expect(templateEditor.props().readOnly).toBeTruthy();
      });

      // No add template button
      const addTemplateButtons = wrapper.find(
        'EuiButtonEmpty[data-test-subj="addRoleTemplateButton"]'
      );
      expect(addTemplateButtons).toHaveLength(0);
    });
  });
});

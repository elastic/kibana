/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox } from '@elastic/eui';
import React from 'react';

import { findTestSubject, mountWithIntl } from '@kbn/test-jest-helpers';

import { RoleTemplateEditor } from './role_template_editor';
import { RoleTemplateTypeSelect } from './role_template_type_select';

describe('RoleTemplateEditor', () => {
  it('allows inline templates to be edited', () => {
    const props = {
      roleTemplate: {
        template: {
          source: '{{username}}_foo',
        },
      },
      onChange: jest.fn(),
      onDelete: jest.fn(),
      canUseStoredScripts: true,
      canUseInlineScripts: true,
    };

    const wrapper = mountWithIntl(<RoleTemplateEditor {...props} />);
    (
      wrapper.find('EuiFieldText[data-test-subj="roleTemplateSourceEditor"]').props() as any
    ).onChange({ target: { value: 'new_script' } });

    expect(props.onChange).toHaveBeenCalledWith({
      template: {
        source: 'new_script',
      },
    });
  });

  it('warns when editing inline scripts when they are disabled', () => {
    const props = {
      roleTemplate: {
        template: {
          source: '{{username}}_foo',
        },
      },
      onChange: jest.fn(),
      onDelete: jest.fn(),
      canUseStoredScripts: true,
      canUseInlineScripts: false,
    };

    const wrapper = mountWithIntl(<RoleTemplateEditor {...props} />);
    expect(findTestSubject(wrapper, 'roleMappingInlineScriptsDisabled')).toHaveLength(1);
    expect(findTestSubject(wrapper, 'roleMappingStoredScriptsDisabled')).toHaveLength(0);
    expect(findTestSubject(wrapper, 'roleMappingInvalidRoleTemplate')).toHaveLength(0);
  });

  it('warns when editing stored scripts when they are disabled', () => {
    const props = {
      roleTemplate: {
        template: {
          id: '{{username}}_foo',
        },
      },
      onChange: jest.fn(),
      onDelete: jest.fn(),
      canUseStoredScripts: false,
      canUseInlineScripts: true,
    };

    const wrapper = mountWithIntl(<RoleTemplateEditor {...props} />);
    expect(findTestSubject(wrapper, 'roleMappingInlineScriptsDisabled')).toHaveLength(0);
    expect(findTestSubject(wrapper, 'roleMappingStoredScriptsDisabled')).toHaveLength(1);
    expect(findTestSubject(wrapper, 'roleMappingInvalidRoleTemplate')).toHaveLength(0);
  });

  it('allows template types to be changed', () => {
    const props = {
      roleTemplate: {
        template: {
          source: '{{username}}_foo',
        },
      },
      onChange: jest.fn(),
      onDelete: jest.fn(),
      canUseStoredScripts: true,
      canUseInlineScripts: true,
    };

    const wrapper = mountWithIntl(<RoleTemplateEditor {...props} />);
    (
      wrapper.find('EuiComboBox[data-test-subj="roleMappingsFormTemplateType"]').props() as any
    ).onChange('stored');

    expect(props.onChange).toHaveBeenCalledWith({
      template: {
        id: '',
      },
    });
  });

  it('warns when an invalid role template is specified', () => {
    const props = {
      roleTemplate: {
        template: `This is a string instead of an object if the template was stored in an unparsable format in ES`,
      },
      onChange: jest.fn(),
      onDelete: jest.fn(),
      canUseStoredScripts: true,
      canUseInlineScripts: true,
    };

    const wrapper = mountWithIntl(<RoleTemplateEditor {...props} />);
    expect(findTestSubject(wrapper, 'roleMappingInvalidRoleTemplate')).toHaveLength(1);
    expect(findTestSubject(wrapper, 'roleTemplateSourceEditor')).toHaveLength(0);
    expect(findTestSubject(wrapper, 'roleTemplateScriptIdEditor')).toHaveLength(0);
  });

  it('can render a readonly view', () => {
    const props = {
      roleTemplate: {
        template: {
          source: '{{username}}_foo',
        },
      },
      onChange: jest.fn(),
      onDelete: jest.fn(),
      canUseStoredScripts: true,
      canUseInlineScripts: true,
      readOnly: true,
    };

    const wrapper = mountWithIntl(<RoleTemplateEditor {...props} />);

    // Any/all Template type selectors are readonly
    const typeSelectors = wrapper.find(RoleTemplateTypeSelect);
    expect(typeSelectors).not.toHaveLength(0);
    typeSelectors.map((typeSelector) => {
      expect(typeSelector.props().readOnly).toBeTruthy();
    });

    // Any/all Template type combo boxes to be disabled
    const typeCombos = wrapper.find(EuiComboBox);
    expect(typeCombos).toHaveLength(typeSelectors.length);
    typeCombos.map((typeCombo) => {
      expect(typeCombo.props().isDisabled).toBeTruthy();
    });

    // Any/all JSON switches are disabled
    const jsonSwitches = wrapper.find('EuiSwitch[data-test-subj="roleTemplateFormatSwitch"]');
    expect(jsonSwitches).toHaveLength(typeSelectors.length);
    jsonSwitches.map((jsonSwitch) => {
      expect(jsonSwitch.props().disabled).toBeTruthy();
    });

    // Any/all template source inputs are disabled
    const templateSourceInputs = wrapper.find(
      'EuiFieldText[data-test-subj="roleTemplateSourceEditor"]'
    );
    expect(templateSourceInputs).toHaveLength(typeSelectors.length);
    templateSourceInputs.map((templateSource) => {
      expect(templateSource.props().disabled).toBeTruthy();
    });

    // No delete buttons
    expect(findTestSubject(wrapper, 'deleteRoleTemplateButton')).toHaveLength(0);
  });
});

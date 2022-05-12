/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { findTestSubject, mountWithIntl } from '@kbn/test-jest-helpers';

import { RoleTemplateEditor } from './role_template_editor';

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
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiTextArea } from '@elastic/eui';
import React from 'react';
import { mountWithIntl, shallowWithIntl } from '@kbn/test/jest';
import { RoleValidator } from '../../validate_role';
import { IndexPrivilegeForm } from './index_privilege_form';

test('it renders without crashing', () => {
  const props = {
    indexPrivilege: {
      names: [],
      privileges: [],
      query: '',
      field_security: {
        grant: [],
      },
    },
    formIndex: 0,
    indexPatterns: [],
    availableFields: [],
    availableIndexPrivileges: ['all', 'read', 'write', 'index'],
    isRoleReadOnly: false,
    allowDocumentLevelSecurity: true,
    allowFieldLevelSecurity: true,
    validator: new RoleValidator(),
    onChange: jest.fn(),
    onDelete: jest.fn(),
    intl: {} as any,
  };

  const wrapper = shallowWithIntl(<IndexPrivilegeForm {...props} />);
  expect(wrapper).toMatchSnapshot();
});

test('it allows for custom index privileges', () => {
  const props = {
    indexPrivilege: {
      names: ['foo'],
      privileges: ['existing-custom', 'read'],
      query: '',
      field_security: {
        grant: [],
      },
    },
    formIndex: 0,
    indexPatterns: [],
    availableFields: [],
    availableIndexPrivileges: ['all', 'read', 'write', 'index'],
    isRoleReadOnly: false,
    allowDocumentLevelSecurity: true,
    allowFieldLevelSecurity: true,
    validator: new RoleValidator(),
    onChange: jest.fn(),
    onDelete: jest.fn(),
    intl: {} as any,
  };

  const wrapper = mountWithIntl(<IndexPrivilegeForm {...props} />);

  const indexPrivsSelect = wrapper.find('EuiComboBox[data-test-subj="privilegesInput0"]');

  (indexPrivsSelect.props() as any).onCreateOption('custom-index-privilege');

  expect(props.onChange).toHaveBeenCalledWith(
    expect.objectContaining({ privileges: ['existing-custom', 'read', 'custom-index-privilege'] })
  );
});

describe('delete button', () => {
  const props = {
    indexPrivilege: {
      names: [],
      privileges: [],
      query: '',
      field_security: {
        grant: [],
      },
    },
    formIndex: 0,
    indexPatterns: [],
    availableFields: [],
    availableIndexPrivileges: ['all', 'read', 'write', 'index'],
    isRoleReadOnly: false,
    allowDocumentLevelSecurity: true,
    allowFieldLevelSecurity: true,
    validator: new RoleValidator(),
    onChange: jest.fn(),
    onDelete: jest.fn(),
    intl: {} as any,
  };

  test('it is hidden when isRoleReadOnly is true', () => {
    const testProps = {
      ...props,
      isRoleReadOnly: true,
    };
    const wrapper = mountWithIntl(<IndexPrivilegeForm {...testProps} />);
    expect(wrapper.find(EuiButtonIcon)).toHaveLength(0);
  });

  test('it is shown when isRoleReadOnly is false', () => {
    const testProps = {
      ...props,
      isRoleReadOnly: false,
    };
    const wrapper = mountWithIntl(<IndexPrivilegeForm {...testProps} />);
    expect(wrapper.find(EuiButtonIcon)).toHaveLength(1);
  });

  test('it invokes onDelete when clicked', () => {
    const testProps = {
      ...props,
      isRoleReadOnly: false,
    };
    const wrapper = mountWithIntl(<IndexPrivilegeForm {...testProps} />);
    wrapper.find(EuiButtonIcon).simulate('click');
    expect(testProps.onDelete).toHaveBeenCalledTimes(1);
  });
});

describe(`document level security`, () => {
  const props = {
    indexPrivilege: {
      names: [],
      privileges: [],
      query: 'some query',
      field_security: {
        grant: [],
      },
    },
    formIndex: 0,
    indexPatterns: [],
    availableFields: [],
    availableIndexPrivileges: ['all', 'read', 'write', 'index'],
    isRoleReadOnly: false,
    allowDocumentLevelSecurity: true,
    allowFieldLevelSecurity: true,
    validator: new RoleValidator(),
    onChange: jest.fn(),
    onDelete: jest.fn(),
    intl: {} as any,
  };

  test(`inputs are hidden when DLS is not allowed`, () => {
    const testProps = {
      ...props,
      allowDocumentLevelSecurity: false,
    };

    const wrapper = mountWithIntl(<IndexPrivilegeForm {...testProps} />);
    expect(wrapper.find('EuiSwitch[data-test-subj="restrictDocumentsQuery0"]')).toHaveLength(0);
    expect(wrapper.find(EuiTextArea)).toHaveLength(0);
  });

  test('only the switch is shown when allowed, and query is empty', () => {
    const testProps = {
      ...props,
      indexPrivilege: {
        ...props.indexPrivilege,
        query: '',
      },
    };

    const wrapper = mountWithIntl(<IndexPrivilegeForm {...testProps} />);
    expect(wrapper.find('EuiSwitch[data-test-subj="restrictDocumentsQuery0"]')).toHaveLength(1);
    expect(wrapper.find(EuiTextArea)).toHaveLength(0);
  });

  test('both inputs are shown when allowed, and query is not empty', () => {
    const testProps = {
      ...props,
    };

    const wrapper = mountWithIntl(<IndexPrivilegeForm {...testProps} />);
    expect(wrapper.find('EuiSwitch[data-test-subj="restrictDocumentsQuery0"]')).toHaveLength(1);
    expect(wrapper.find(EuiTextArea)).toHaveLength(1);
  });
});

describe('field level security', () => {
  const props = {
    indexPrivilege: {
      names: [],
      privileges: [],
      query: '',
      field_security: {
        grant: ['foo*'],
      },
    },
    formIndex: 0,
    indexPatterns: [],
    availableFields: [],
    availableIndexPrivileges: ['all', 'read', 'write', 'index'],
    isRoleReadOnly: false,
    allowDocumentLevelSecurity: true,
    allowFieldLevelSecurity: true,
    validator: new RoleValidator(),
    onChange: jest.fn(),
    onDelete: jest.fn(),
    intl: {} as any,
  };

  test(`inputs are hidden when FLS is not allowed`, () => {
    const testProps = {
      ...props,
      allowFieldLevelSecurity: false,
    };

    const wrapper = mountWithIntl(<IndexPrivilegeForm {...testProps} />);
    expect(wrapper.find('EuiSwitch[data-test-subj="restrictFieldsQuery0"]')).toHaveLength(0);
    expect(wrapper.find('.indexPrivilegeForm__grantedFieldsRow')).toHaveLength(0);
    expect(wrapper.find('.indexPrivilegeForm__deniedFieldsRow')).toHaveLength(0);
  });

  test('only the switch is shown when allowed, and FLS is empty', () => {
    const testProps = {
      ...props,
      indexPrivilege: {
        ...props.indexPrivilege,
        field_security: {},
      },
    };

    const wrapper = mountWithIntl(<IndexPrivilegeForm {...testProps} />);
    expect(wrapper.find('EuiSwitch[data-test-subj="restrictFieldsQuery0"]')).toHaveLength(1);
    expect(wrapper.find('.indexPrivilegeForm__grantedFieldsRow')).toHaveLength(0);
    expect(wrapper.find('.indexPrivilegeForm__deniedFieldsRow')).toHaveLength(0);
  });

  test('inputs are shown when allowed', () => {
    const testProps = {
      ...props,
    };

    const wrapper = mountWithIntl(<IndexPrivilegeForm {...testProps} />);
    expect(wrapper.find('div.indexPrivilegeForm__grantedFieldsRow')).toHaveLength(1);
    expect(wrapper.find('div.indexPrivilegeForm__deniedFieldsRow')).toHaveLength(1);
  });

  test('it displays a warning when no fields are granted', () => {
    const testProps = {
      ...props,
      indexPrivilege: {
        ...props.indexPrivilege,
        field_security: {
          grant: [],
          except: ['foo'],
        },
      },
    };

    const wrapper = mountWithIntl(<IndexPrivilegeForm {...testProps} />);
    expect(wrapper.find('div.indexPrivilegeForm__grantedFieldsRow')).toHaveLength(1);
    expect(wrapper.find('div.indexPrivilegeForm__deniedFieldsRow')).toHaveLength(1);
    expect(wrapper.find('.euiFormHelpText')).toHaveLength(1);
  });

  test('it does not display a warning when fields are granted', () => {
    const testProps = {
      ...props,
    };

    const wrapper = mountWithIntl(<IndexPrivilegeForm {...testProps} />);
    expect(wrapper.find('div.indexPrivilegeForm__grantedFieldsRow')).toHaveLength(1);
    expect(wrapper.find('div.indexPrivilegeForm__deniedFieldsRow')).toHaveLength(1);
    expect(wrapper.find('.euiFormHelpText')).toHaveLength(0);
  });
});

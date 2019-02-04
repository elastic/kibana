/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiButtonIcon, EuiSwitch, EuiTextArea } from '@elastic/eui';
import React from 'react';
import { mountWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';
import { RoleValidator } from '../../../lib/validate_role';
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
    isReservedRole: false,
    allowDelete: true,
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
    isReservedRole: false,
    allowDelete: true,
    allowDocumentLevelSecurity: true,
    allowFieldLevelSecurity: true,
    validator: new RoleValidator(),
    onChange: jest.fn(),
    onDelete: jest.fn(),
    intl: {} as any,
  };

  test('it is hidden when allowDelete is false', () => {
    const testProps = {
      ...props,
      allowDelete: false,
    };
    const wrapper = mountWithIntl(<IndexPrivilegeForm {...testProps} />);
    expect(wrapper.find(EuiButtonIcon)).toHaveLength(0);
  });

  test('it is shown when allowDelete is true', () => {
    const testProps = {
      ...props,
      allowDelete: true,
    };
    const wrapper = mountWithIntl(<IndexPrivilegeForm {...testProps} />);
    expect(wrapper.find(EuiButtonIcon)).toHaveLength(1);
  });

  test('it invokes onDelete when clicked', () => {
    const testProps = {
      ...props,
      allowDelete: true,
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
    isReservedRole: false,
    allowDelete: true,
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
    expect(wrapper.find(EuiSwitch)).toHaveLength(0);
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
    expect(wrapper.find(EuiSwitch)).toHaveLength(1);
    expect(wrapper.find(EuiTextArea)).toHaveLength(0);
  });

  test('both inputs are shown when allowed, and query is not empty', () => {
    const testProps = {
      ...props,
    };

    const wrapper = mountWithIntl(<IndexPrivilegeForm {...testProps} />);
    expect(wrapper.find(EuiSwitch)).toHaveLength(1);
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
    isReservedRole: false,
    allowDelete: true,
    allowDocumentLevelSecurity: true,
    allowFieldLevelSecurity: true,
    validator: new RoleValidator(),
    onChange: jest.fn(),
    onDelete: jest.fn(),
    intl: {} as any,
  };

  test(`input is hidden when FLS is not allowed`, () => {
    const testProps = {
      ...props,
      allowFieldLevelSecurity: false,
    };

    const wrapper = mountWithIntl(<IndexPrivilegeForm {...testProps} />);
    expect(wrapper.find('.indexPrivilegeForm__grantedFieldsRow')).toHaveLength(0);
  });

  test('input is shown when allowed', () => {
    const testProps = {
      ...props,
    };

    const wrapper = mountWithIntl(<IndexPrivilegeForm {...testProps} />);
    expect(wrapper.find('div.indexPrivilegeForm__grantedFieldsRow')).toHaveLength(1);
  });

  test('it displays a warning when no fields are granted', () => {
    const testProps = {
      ...props,
      indexPrivilege: {
        ...props.indexPrivilege,
        field_security: {
          grant: [],
        },
      },
    };

    const wrapper = mountWithIntl(<IndexPrivilegeForm {...testProps} />);
    expect(wrapper.find('div.indexPrivilegeForm__grantedFieldsRow')).toHaveLength(1);
    expect(wrapper.find('.euiFormHelpText')).toHaveLength(1);
  });

  test('it does not display a warning when fields are granted', () => {
    const testProps = {
      ...props,
    };

    const wrapper = mountWithIntl(<IndexPrivilegeForm {...testProps} />);
    expect(wrapper.find('div.indexPrivilegeForm__grantedFieldsRow')).toHaveLength(1);
    expect(wrapper.find('.euiFormHelpText')).toHaveLength(0);
  });
});

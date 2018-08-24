/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiButtonIcon, EuiSwitch, EuiTextArea } from '@elastic/eui';
import { mount, shallow } from 'enzyme';
import React from 'react';
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
  };

  const wrapper = shallow(<IndexPrivilegeForm {...props} />);
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
  };

  test('it is hidden when allowDelete is false', () => {
    const testProps = {
      ...props,
      allowDelete: false,
    };
    const wrapper = mount(<IndexPrivilegeForm {...testProps} />);
    expect(wrapper.find(EuiButtonIcon)).toHaveLength(0);
  });

  test('it is shown when allowDelete is true', () => {
    const testProps = {
      ...props,
      allowDelete: true,
    };
    const wrapper = mount(<IndexPrivilegeForm {...testProps} />);
    expect(wrapper.find(EuiButtonIcon)).toHaveLength(1);
  });

  test('it invokes onDelete when clicked', () => {
    const testProps = {
      ...props,
      allowDelete: true,
    };
    const wrapper = mount(<IndexPrivilegeForm {...testProps} />);
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
  };

  test(`inputs are hidden when DLS is not allowed`, () => {
    const testProps = {
      ...props,
      allowDocumentLevelSecurity: false,
    };

    const wrapper = mount(<IndexPrivilegeForm {...testProps} />);
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

    const wrapper = mount(<IndexPrivilegeForm {...testProps} />);
    expect(wrapper.find(EuiSwitch)).toHaveLength(1);
    expect(wrapper.find(EuiTextArea)).toHaveLength(0);
  });

  test('both inputs are shown when allowed, and query is not empty', () => {
    const testProps = {
      ...props,
    };

    const wrapper = mount(<IndexPrivilegeForm {...testProps} />);
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
  };

  test(`input is hidden when FLS is not allowed`, () => {
    const testProps = {
      ...props,
      allowFieldLevelSecurity: false,
    };

    const wrapper = mount(<IndexPrivilegeForm {...testProps} />);
    expect(wrapper.find('.indexPrivilegeForm__grantedFieldsRow')).toHaveLength(0);
  });

  test('input is shown when allowed', () => {
    const testProps = {
      ...props,
    };

    const wrapper = mount(<IndexPrivilegeForm {...testProps} />);
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

    const wrapper = mount(<IndexPrivilegeForm {...testProps} />);
    expect(wrapper.find('div.indexPrivilegeForm__grantedFieldsRow')).toHaveLength(1);
    expect(wrapper.find('.euiFormHelpText')).toHaveLength(1);
  });

  test('it does not display a warning when fields are granted', () => {
    const testProps = {
      ...props,
    };

    const wrapper = mount(<IndexPrivilegeForm {...testProps} />);
    expect(wrapper.find('div.indexPrivilegeForm__grantedFieldsRow')).toHaveLength(1);
    expect(wrapper.find('.euiFormHelpText')).toHaveLength(0);
  });
});

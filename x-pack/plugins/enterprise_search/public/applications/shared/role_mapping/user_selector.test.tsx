/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchUsers } from './__mocks__/elasticsearch_users';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiFormRow } from '@elastic/eui';

import { RoleTypes as ASRole } from '../../app_search/types';

import { REQUIRED_LABEL, USERNAME_NO_USERS_TEXT } from './constants';

import { UserSelector } from '.';

const simulatedEvent = {
  target: { value: 'foo' },
};

describe('UserSelector', () => {
  const setUserExisting = jest.fn();
  const setElasticsearchUsernameValue = jest.fn();
  const setElasticsearchEmailValue = jest.fn();
  const handleRoleChange = jest.fn();
  const handleUsernameSelectChange = jest.fn();

  const roleType = 'user' as unknown as ASRole;

  const props = {
    isNewUser: true,
    smtpSettingsPresent: false,
    userFormUserIsExisting: true,
    elasticsearchUsers,
    elasticsearchUser: elasticsearchUsers[0],
    roleTypes: [roleType],
    roleType,
    setUserExisting,
    setElasticsearchUsernameValue,
    setElasticsearchEmailValue,
    handleRoleChange,
    handleUsernameSelectChange,
  };

  it('renders Role select and calls method', () => {
    const wrapper = shallow(<UserSelector {...props} />);
    wrapper.find('[data-test-subj="RoleSelect"]').simulate('change', simulatedEvent);

    expect(handleRoleChange).toHaveBeenCalled();
  });

  it('renders when updating user', () => {
    const wrapper = shallow(<UserSelector {...props} isNewUser={false} />);

    expect(wrapper.find('[data-test-subj="UsernameInput"]')).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="EmailInput"]')).toHaveLength(1);
  });

  it('renders Username select and calls method', () => {
    const wrapper = shallow(<UserSelector {...props} />);
    wrapper.find('[data-test-subj="UsernameSelect"]').simulate('change', simulatedEvent);

    expect(handleUsernameSelectChange).toHaveBeenCalled();
  });

  it('renders Existing user radio and calls method', () => {
    const wrapper = shallow(<UserSelector {...props} />);
    wrapper.find('[data-test-subj="ExistingUserRadio"]').simulate('change');

    expect(setUserExisting).toHaveBeenCalledWith(true);
  });

  it('renders Email input and calls method', () => {
    const wrapper = shallow(<UserSelector {...props} userFormUserIsExisting={false} />);
    wrapper.find('[data-test-subj="EmailInput"]').simulate('change', simulatedEvent);

    expect(setElasticsearchEmailValue).toHaveBeenCalled();
  });

  it('renders Username input and calls method', () => {
    const wrapper = shallow(<UserSelector {...props} userFormUserIsExisting={false} />);
    wrapper.find('[data-test-subj="UsernameInput"]').simulate('change', simulatedEvent);

    expect(setElasticsearchUsernameValue).toHaveBeenCalled();
  });

  it('renders New user radio and calls method', () => {
    const wrapper = shallow(<UserSelector {...props} />);
    wrapper.find('[data-test-subj="NewUserRadio"]').simulate('change');

    expect(setUserExisting).toHaveBeenCalledWith(false);
  });

  it('renders helpText when values are empty', () => {
    const wrapper = shallow(
      <UserSelector
        {...props}
        userFormUserIsExisting={false}
        elasticsearchUsers={[]}
        elasticsearchUser={{ email: '', username: '', enabled: true }}
      />
    );

    expect(wrapper.find(EuiFormRow).at(0).prop('helpText')).toEqual(USERNAME_NO_USERS_TEXT);
    expect(wrapper.find(EuiFormRow).at(1).prop('helpText')).toEqual(REQUIRED_LABEL);
  });
});

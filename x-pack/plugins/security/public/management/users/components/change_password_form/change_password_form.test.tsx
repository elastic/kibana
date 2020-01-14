/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiFieldText } from '@elastic/eui';
import { ReactWrapper } from 'enzyme';
import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { User } from '../../../../../common/model';
import { ChangePasswordForm } from './change_password_form';

import { coreMock } from '../../../../../../../../src/core/public/mocks';
import { userAPIClientMock } from '../../index.mock';

function getCurrentPasswordField(wrapper: ReactWrapper<any>) {
  return wrapper.find(EuiFieldText).filter('[data-test-subj="currentPassword"]');
}

function getNewPasswordField(wrapper: ReactWrapper<any>) {
  return wrapper.find(EuiFieldText).filter('[data-test-subj="newPassword"]');
}

function getConfirmPasswordField(wrapper: ReactWrapper<any>) {
  return wrapper.find(EuiFieldText).filter('[data-test-subj="confirmNewPassword"]');
}

describe('<ChangePasswordForm>', () => {
  describe('for the current user', () => {
    it('shows fields for current and new passwords', () => {
      const user: User = {
        username: 'user',
        full_name: 'john smith',
        email: 'john@smith.com',
        enabled: true,
        roles: [],
      };

      const wrapper = mountWithIntl(
        <ChangePasswordForm
          user={user}
          isUserChangingOwnPassword={true}
          apiClient={userAPIClientMock.create()}
          notifications={coreMock.createStart().notifications}
        />
      );

      expect(getCurrentPasswordField(wrapper)).toHaveLength(1);
      expect(getNewPasswordField(wrapper)).toHaveLength(1);
      expect(getConfirmPasswordField(wrapper)).toHaveLength(1);
    });

    it('allows a password to be changed', () => {
      const user: User = {
        username: 'user',
        full_name: 'john smith',
        email: 'john@smith.com',
        enabled: true,
        roles: [],
      };

      const callback = jest.fn();

      const apiClientMock = userAPIClientMock.create();

      const wrapper = mountWithIntl(
        <ChangePasswordForm
          user={user}
          isUserChangingOwnPassword={true}
          onChangePassword={callback}
          apiClient={apiClientMock}
          notifications={coreMock.createStart().notifications}
        />
      );

      const currentPassword = getCurrentPasswordField(wrapper);
      currentPassword.props().onChange!({ target: { value: 'myCurrentPassword' } } as any);

      const newPassword = getNewPasswordField(wrapper);
      newPassword.props().onChange!({ target: { value: 'myNewPassword' } } as any);

      const confirmPassword = getConfirmPasswordField(wrapper);
      confirmPassword.props().onChange!({ target: { value: 'myNewPassword' } } as any);

      wrapper.find('button[data-test-subj="changePasswordButton"]').simulate('click');

      expect(apiClientMock.changePassword).toHaveBeenCalledTimes(1);
      expect(apiClientMock.changePassword).toHaveBeenCalledWith(
        'user',
        'myNewPassword',
        'myCurrentPassword'
      );
    });
  });

  describe('for another user', () => {
    it('shows fields for new password only', () => {
      const user: User = {
        username: 'user',
        full_name: 'john smith',
        email: 'john@smith.com',
        enabled: true,
        roles: [],
      };

      const wrapper = mountWithIntl(
        <ChangePasswordForm
          user={user}
          isUserChangingOwnPassword={false}
          apiClient={userAPIClientMock.create()}
          notifications={coreMock.createStart().notifications}
        />
      );

      expect(getCurrentPasswordField(wrapper)).toHaveLength(0);
      expect(getNewPasswordField(wrapper)).toHaveLength(1);
      expect(getConfirmPasswordField(wrapper)).toHaveLength(1);
    });
  });
});

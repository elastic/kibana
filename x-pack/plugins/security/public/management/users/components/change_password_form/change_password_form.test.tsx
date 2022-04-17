/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldPassword } from '@elastic/eui';
import type { ReactWrapper } from 'enzyme';
import React from 'react';

import { coreMock } from '@kbn/core/public/mocks';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import type { User } from '../../../../../common/model';
import { userAPIClientMock } from '../../index.mock';
import { ChangePasswordForm } from './change_password_form';

function getCurrentPasswordField(wrapper: ReactWrapper<any>) {
  return wrapper.find(EuiFieldPassword).filter('[data-test-subj="currentPassword"]');
}

function getNewPasswordField(wrapper: ReactWrapper<any>) {
  return wrapper.find(EuiFieldPassword).filter('[data-test-subj="newPassword"]');
}

function getConfirmPasswordField(wrapper: ReactWrapper<any>) {
  return wrapper.find(EuiFieldPassword).filter('[data-test-subj="confirmNewPassword"]');
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
          userAPIClient={userAPIClientMock.create()}
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
          userAPIClient={apiClientMock}
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
          userAPIClient={userAPIClientMock.create()}
          notifications={coreMock.createStart().notifications}
        />
      );

      expect(getCurrentPasswordField(wrapper)).toHaveLength(0);
      expect(getNewPasswordField(wrapper)).toHaveLength(1);
      expect(getConfirmPasswordField(wrapper)).toHaveLength(1);
    });
  });
});

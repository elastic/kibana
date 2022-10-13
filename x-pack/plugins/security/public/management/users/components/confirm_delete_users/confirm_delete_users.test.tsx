/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { coreMock } from '@kbn/core/public/mocks';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import { userAPIClientMock } from '../../index.mock';
import { ConfirmDeleteUsers } from './confirm_delete_users';

describe('ConfirmDeleteUsers', () => {
  it('renders a warning for a single user', () => {
    const wrapper = mountWithIntl(
      <ConfirmDeleteUsers
        userAPIClient={userAPIClientMock.create()}
        notifications={coreMock.createStart().notifications}
        usersToDelete={['foo']}
        onCancel={jest.fn()}
      />
    );

    expect(wrapper.find('EuiModalHeaderTitle').text()).toMatchInlineSnapshot(`"Delete user foo"`);
  });

  it('renders a warning for a multiple users', () => {
    const wrapper = mountWithIntl(
      <ConfirmDeleteUsers
        userAPIClient={userAPIClientMock.create()}
        notifications={coreMock.createStart().notifications}
        usersToDelete={['foo', 'bar', 'baz']}
        onCancel={jest.fn()}
      />
    );

    expect(wrapper.find('EuiModalHeaderTitle').text()).toMatchInlineSnapshot(`"Delete 3 users"`);
  });

  it('fires onCancel when the operation is cancelled', () => {
    const onCancel = jest.fn();
    const wrapper = mountWithIntl(
      <ConfirmDeleteUsers
        userAPIClient={userAPIClientMock.create()}
        notifications={coreMock.createStart().notifications}
        usersToDelete={['foo']}
        onCancel={onCancel}
      />
    );

    expect(onCancel).toBeCalledTimes(0);

    wrapper.find('EuiButtonEmpty[data-test-subj="confirmModalCancelButton"]').simulate('click');

    expect(onCancel).toBeCalledTimes(1);
  });

  it('deletes the requested users when confirmed', () => {
    const onCancel = jest.fn();
    const apiClientMock = userAPIClientMock.create();

    const wrapper = mountWithIntl(
      <ConfirmDeleteUsers
        usersToDelete={['foo', 'bar']}
        userAPIClient={apiClientMock}
        notifications={coreMock.createStart().notifications}
        onCancel={onCancel}
      />
    );

    wrapper.find('EuiButton[data-test-subj="confirmModalConfirmButton"]').simulate('click');

    expect(apiClientMock.deleteUser).toBeCalledTimes(2);
    expect(apiClientMock.deleteUser).toBeCalledWith('foo');
    expect(apiClientMock.deleteUser).toBeCalledWith('bar');
  });

  it('attempts to delete all users even if some fail', () => {
    const onCancel = jest.fn();

    const apiClientMock = userAPIClientMock.create();
    apiClientMock.deleteUser.mockImplementation((user) => {
      if (user === 'foo') {
        return Promise.reject('something terrible happened');
      }
      return Promise.resolve();
    });

    const wrapper = mountWithIntl(
      <ConfirmDeleteUsers
        usersToDelete={['foo', 'bar']}
        userAPIClient={apiClientMock}
        notifications={coreMock.createStart().notifications}
        onCancel={onCancel}
      />
    );

    wrapper.find('EuiButton[data-test-subj="confirmModalConfirmButton"]').simulate('click');

    expect(apiClientMock.deleteUser).toBeCalledTimes(2);
    expect(apiClientMock.deleteUser).toBeCalledWith('foo');
    expect(apiClientMock.deleteUser).toBeCalledWith('bar');
  });
});

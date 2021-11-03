/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../__mocks__/shallow_useeffect.mock';
import { mockKibanaValues } from '../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiButton, EuiLink, EuiEmptyPrompt } from '@elastic/eui';

import { RolesEmptyPrompt } from './roles_empty_prompt';

describe('RolesEmptyPrompt', () => {
  const {
    security: {
      authc: { getCurrentUser },
    },
  } = mockKibanaValues;

  const mockCurrentUser = (user?: unknown) =>
    (getCurrentUser as jest.Mock).mockReturnValue(Promise.resolve(user));

  const mockCurrentUserError = () =>
    (getCurrentUser as jest.Mock).mockReturnValue(Promise.reject());

  const onEnable = jest.fn();

  const props = {
    productName: 'App Search',
    docsLink: 'http://elastic.co',
    onEnable,
  };

  const mockUser = {
    username: 'elastic',
    roles: ['superuser'],
  };

  beforeAll(() => {
    mockCurrentUser();
  });

  it('gets the current user on mount', () => {
    shallow(<RolesEmptyPrompt {...props} />);

    expect(getCurrentUser).toHaveBeenCalled();
  });

  it('does not render if the getCurrentUser promise returns error', async () => {
    mockCurrentUserError();
    const wrapper = await shallow(<RolesEmptyPrompt {...props} />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });

  it('renders', async () => {
    mockCurrentUser(mockUser);
    const wrapper = await shallow(<RolesEmptyPrompt {...props} />);

    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(1);
    expect(wrapper.find(EuiEmptyPrompt).dive().find(EuiLink).prop('href')).toEqual(props.docsLink);
  });

  it('disables button when non-superuser', async () => {
    mockCurrentUser({
      username: 'user',
      roles: ['foo'],
    });
    const wrapper = await shallow(<RolesEmptyPrompt {...props} />);

    expect(wrapper.find(EuiEmptyPrompt).dive().find(EuiButton).prop('disabled')).toBe(true);
    expect(
      wrapper.find(EuiEmptyPrompt).dive().find('[data-test-subj="rbacDisabledLabel"]')
    ).toHaveLength(1);
  });

  it('calls onEnable on change', async () => {
    mockCurrentUser(mockUser);
    const wrapper = await shallow(<RolesEmptyPrompt {...props} />);
    const prompt = wrapper.find(EuiEmptyPrompt).dive();
    prompt.find(EuiButton).simulate('click');

    expect(onEnable).toHaveBeenCalled();
  });
});

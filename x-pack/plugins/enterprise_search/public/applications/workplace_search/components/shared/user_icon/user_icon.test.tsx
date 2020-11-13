/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { users } from '../../../__mocks__/users.mock';

import { UserIcon } from './user_icon';

describe('SourcesTable', () => {
  it('renders with picture', () => {
    const wrapper = shallow(<UserIcon {...users[0]} />);

    expect(wrapper.find('.user-icon')).toHaveLength(1);
    expect(wrapper.find('.avatar__image')).toHaveLength(1);
  });

  it('renders without picture', () => {
    const user = {
      ...users[0],
      pictureUrl: null,
    };
    const wrapper = shallow(<UserIcon {...user} />);

    expect(wrapper.find('.user-icon')).toHaveLength(1);
    expect(wrapper.find('.avatar__text')).toHaveLength(1);
  });

  it('renders fallback "alt" value when name not present', () => {
    const user = {
      ...users[0],
      name: null,
    };
    const wrapper = shallow(<UserIcon {...user} />);

    expect(wrapper.find('img').prop('alt')).toEqual(user.email);
  });
});

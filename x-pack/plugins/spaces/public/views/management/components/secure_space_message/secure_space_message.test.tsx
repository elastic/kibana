/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { shallow } from 'enzyme';
import React from 'react';
import { UserProfile } from '../../../../../../xpack_main/common/user_profile';
import { SecureSpaceMessage } from './secure_space_message';

describe('SecureSpaceMessage', () => {
  it(`doesn't render if user profile does not allow security to be managed`, () => {
    const userProfile = new UserProfile({
      manageSecurity: false,
    });

    expect(shallow(<SecureSpaceMessage userProfile={userProfile} />)).toMatchSnapshot();
  });

  it(`renders if user profile allows security to be managed`, () => {
    const userProfile = new UserProfile({
      manageSecurity: true,
    });

    expect(shallow(<SecureSpaceMessage userProfile={userProfile} />)).toMatchSnapshot();
  });
});

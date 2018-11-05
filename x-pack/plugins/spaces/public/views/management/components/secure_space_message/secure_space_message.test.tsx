/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { SecureSpaceMessage } from './secure_space_message';

describe('SecureSpaceMessage', () => {
  it(`doesn't render if user profile does not allow security to be managed`, () => {

    expect(shallowWithIntl(<SecureSpaceMessage userProfile={userProfile} />)).toMatchSnapshot();
  });

  it(`renders if user profile allows security to be managed`, () => {
    const userProfile = new UserProfile({
      manageSecurity: true,
    });

    expect(shallowWithIntl(<SecureSpaceMessage userProfile={userProfile} />)).toMatchSnapshot();
  });
});

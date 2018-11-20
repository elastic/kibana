/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
<<<<<<< HEAD
import { shallow } from 'enzyme';
import React from 'react';
=======
import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
import { SecureSpaceMessage } from './secure_space_message';

describe('SecureSpaceMessage', () => {
  it(`doesn't render if user profile does not allow security to be managed`, () => {
    const userProfile = {
      hasCapability: (key: string) => {
        if (key === 'manageSecurity') {
          return false;
        }
        throw new Error(`unexpected capability ${key}`);
      },
    };

<<<<<<< HEAD
    expect(shallow(<SecureSpaceMessage userProfile={userProfile} />)).toMatchSnapshot();
=======
    expect(shallowWithIntl(<SecureSpaceMessage userProfile={userProfile} />)).toMatchSnapshot();
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
  });

  it(`renders if user profile allows security to be managed`, () => {
    const userProfile = {
      hasCapability: (key: string) => {
        if (key === 'manageSecurity') {
          return true;
        }
        throw new Error(`unexpected capability ${key}`);
      },
    };

<<<<<<< HEAD
    expect(shallow(<SecureSpaceMessage userProfile={userProfile} />)).toMatchSnapshot();
=======
    expect(shallowWithIntl(<SecureSpaceMessage userProfile={userProfile} />)).toMatchSnapshot();
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
  });
});

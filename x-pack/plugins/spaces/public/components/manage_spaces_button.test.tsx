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
import { UserProfileProvider } from '../../../xpack_main/public/services/user_profile';
import { ManageSpacesButton } from './manage_spaces_button';

const buildUserProfile = (canManageSpaces: boolean) => {
  return UserProfileProvider({ manageSpaces: canManageSpaces });
};

describe('ManageSpacesButton', () => {
  it('renders as expected', () => {
    const component = <ManageSpacesButton userProfile={buildUserProfile(true)} />;
<<<<<<< HEAD
    expect(shallow(component)).toMatchSnapshot();
=======
    expect(shallowWithIntl(component)).toMatchSnapshot();
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
  });

  it(`doesn't render if user profile forbids managing spaces`, () => {
    const component = <ManageSpacesButton userProfile={buildUserProfile(false)} />;
<<<<<<< HEAD
    expect(shallow(component)).toMatchSnapshot();
=======
    expect(shallowWithIntl(component)).toMatchSnapshot();
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
  });
});

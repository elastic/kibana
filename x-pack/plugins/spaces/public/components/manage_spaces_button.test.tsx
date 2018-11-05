/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { shallow } from 'enzyme';
import React from 'react';
import { UserProfile } from '../../../xpack_main/common/user_profile';
import { ManageSpacesButton } from './manage_spaces_button';

const buildUserProfile = (canManageSpaces: boolean) => {
  return new UserProfile({ manageSpaces: canManageSpaces });
};

describe('ManageSpacesButton', () => {
  it('renders as expected', () => {
    const component = <ManageSpacesButton userProfile={buildUserProfile(true)} />;
    expect(shallow(component)).toMatchSnapshot();
  });

  it(`doesn't render if user profile forbids managing spaces`, () => {
    const component = <ManageSpacesButton userProfile={buildUserProfile(false)} />;
    expect(shallow(component)).toMatchSnapshot();
  });
});

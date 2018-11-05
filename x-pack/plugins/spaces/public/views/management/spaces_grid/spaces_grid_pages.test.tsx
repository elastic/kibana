/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { mount, shallow } from 'enzyme';
import React from 'react';
import { UserProfile } from '../../../../../xpack_main/common/user_profile';
import { SpaceAvatar } from '../../../components';
import { SpacesManager } from '../../../lib';
import { SpacesNavState } from '../../nav_control';
import { SpacesGridPage } from './spaces_grid_page';

const buildUserProfile = (canManageSpaces: boolean) => {
  return new UserProfile({ manageSpaces: canManageSpaces });
};

const spaces = [
  {
    id: 'default',
    name: 'Default',
    _reserved: true,
  },
  {
    id: 'custom-1',
    name: 'Custom 1',
  },
  {
    id: 'custom-2',
    name: 'Custom 2',
    initials: 'LG',
    color: '#ABCDEF',
    description: 'my description here',
  },
];

const mockHttp = {
  get: jest.fn(async () => ({
    data: spaces,
  })),
};

const mockChrome = {
  addBasePath: (path: string) => path,
};

const spacesNavState: SpacesNavState = {
  getActiveSpace: () => spaces[0],
  refreshSpacesList: jest.fn(),
};

const spacesManager = new SpacesManager(mockHttp, mockChrome, '');

describe('SpacesGridPage', () => {
  it('renders as expected', () => {
    expect(
      shallow(
        <SpacesGridPage
          spacesManager={spacesManager}
          spacesNavState={spacesNavState}
          userProfile={buildUserProfile(true)}
        />
      )
    ).toMatchSnapshot();
  });

  it('renders the list of spaces', async () => {
    const wrapper = mount(
      <SpacesGridPage
        spacesManager={spacesManager}
        spacesNavState={spacesNavState}
        userProfile={buildUserProfile(true)}
      />
    );

    // allow spacesManager to load spaces
    await Promise.resolve();
    wrapper.update();
    await Promise.resolve();
    wrapper.update();

    expect(wrapper.find(SpaceAvatar)).toHaveLength(spaces.length);
    expect(wrapper.find(SpaceAvatar)).toMatchSnapshot();
  });
});

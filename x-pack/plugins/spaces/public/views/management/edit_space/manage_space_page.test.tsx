/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { UserProfile } from '../../../../../xpack_main/common/user_profile';
import { SpacesManager } from '../../../lib';
import { SpacesNavState } from '../../nav_control';
import { ManageSpacePage } from './manage_space_page';

const space = {
  id: 'my-space',
  name: 'My Space',
};
const buildMockChrome = () => {
  return {
    addBasePath: (path: string) => path,
  };
};

const buildUserProfile = (canManageSpaces: boolean) => {
  return new UserProfile({ manageSpaces: canManageSpaces });
};

describe('ManageSpacePage', () => {
  it('allows a space to be created', async () => {
    const mockHttp = {
      delete: jest.fn(() => Promise.resolve()),
    };
    const mockChrome = buildMockChrome();

    const spacesManager = new SpacesManager(mockHttp, mockChrome, '/');
    spacesManager.createSpace = jest.fn(spacesManager.createSpace);

    const spacesNavState: SpacesNavState = {
      getActiveSpace: () => space,
      refreshSpacesList: jest.fn(),
    };

    const userProfile = buildUserProfile(true);

    const wrapper = mount(
      <ManageSpacePage
        spacesManager={spacesManager}
        userProfile={userProfile}
        spacesNavState={spacesNavState}
      />
    );
    const nameInput = wrapper.find('input[name="name"]');
    const descriptionInput = wrapper.find('input[name="description"]');

    nameInput.simulate('change', { target: { value: 'New Space Name' } });
    descriptionInput.simulate('change', { target: { value: 'some description' } });

    const createButton = wrapper.find('button[data-test-subj="save-space-button"]');
    createButton.simulate('click');
    await Promise.resolve();

    expect(spacesManager.createSpace).toHaveBeenCalledWith({
      id: 'new-space-name',
      name: 'New Space Name',
      description: 'some description',
      color: undefined,
      initials: undefined,
    });
  });

  it('allows a space to be updated', async () => {
    const mockHttp = {
      get: jest.fn(async () => {
        return Promise.resolve({
          data: {
            id: 'existing-space',
            name: 'Existing Space',
            description: 'hey an existing space',
            color: '#aabbcc',
            initials: 'AB',
          },
        });
      }),
      delete: jest.fn(() => Promise.resolve()),
    };
    const mockChrome = buildMockChrome();

    const spacesManager = new SpacesManager(mockHttp, mockChrome, '/');
    spacesManager.getSpace = jest.fn(spacesManager.getSpace);
    spacesManager.updateSpace = jest.fn(spacesManager.updateSpace);

    const spacesNavState: SpacesNavState = {
      getActiveSpace: () => space,
      refreshSpacesList: jest.fn(),
    };

    const userProfile = buildUserProfile(true);

    const wrapper = mount(
      <ManageSpacePage
        spaceId={'existing-space'}
        spacesManager={spacesManager}
        userProfile={userProfile}
        spacesNavState={spacesNavState}
      />
    );

    await Promise.resolve();

    expect(mockHttp.get).toHaveBeenCalledWith('/api/spaces/space/existing-space');

    await Promise.resolve();

    wrapper.update();

    const nameInput = wrapper.find('input[name="name"]');
    const descriptionInput = wrapper.find('input[name="description"]');

    nameInput.simulate('change', { target: { value: 'New Space Name' } });
    descriptionInput.simulate('change', { target: { value: 'some description' } });

    const createButton = wrapper.find('button[data-test-subj="save-space-button"]');
    createButton.simulate('click');
    await Promise.resolve();

    expect(spacesManager.updateSpace).toHaveBeenCalledWith({
      id: 'existing-space',
      name: 'New Space Name',
      description: 'some description',
      color: '#aabbcc',
      initials: 'AB',
    });
  });
});

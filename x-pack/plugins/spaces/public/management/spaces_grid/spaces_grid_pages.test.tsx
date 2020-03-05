/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mountWithIntl, shallowWithIntl, nextTick } from 'test_utils/enzyme_helpers';
import { SpaceAvatar } from '../../space_avatar';
import { spacesManagerMock } from '../../spaces_manager/mocks';
import { SpacesManager } from '../../spaces_manager';
import { SpacesGridPage } from './spaces_grid_page';
import { httpServiceMock } from 'src/core/public/mocks';
import { notificationServiceMock } from 'src/core/public/mocks';

const spaces = [
  {
    id: 'default',
    name: 'Default',
    disabledFeatures: [],
    _reserved: true,
  },
  {
    id: 'custom-1',
    name: 'Custom 1',
    disabledFeatures: [],
  },
  {
    id: 'custom-2',
    name: 'Custom 2',
    initials: 'LG',
    color: '#ABCDEF',
    description: 'my description here',
    disabledFeatures: [],
  },
];

const spacesManager = spacesManagerMock.create();
spacesManager.getSpaces = jest.fn().mockResolvedValue(spaces);

describe('SpacesGridPage', () => {
  it('renders as expected', () => {
    const httpStart = httpServiceMock.createStartContract();
    httpStart.get.mockResolvedValue([]);

    expect(
      shallowWithIntl(
        <SpacesGridPage
          spacesManager={(spacesManager as unknown) as SpacesManager}
          http={httpStart}
          notifications={notificationServiceMock.createStartContract()}
          securityEnabled={true}
          capabilities={{
            navLinks: {},
            management: {},
            catalogue: {},
            spaces: { manage: true },
          }}
        />
      )
    ).toMatchSnapshot();
  });

  it('renders the list of spaces', async () => {
    const httpStart = httpServiceMock.createStartContract();
    httpStart.get.mockResolvedValue([]);

    const wrapper = mountWithIntl(
      <SpacesGridPage
        spacesManager={(spacesManager as unknown) as SpacesManager}
        http={httpStart}
        notifications={notificationServiceMock.createStartContract()}
        securityEnabled={true}
        capabilities={{
          navLinks: {},
          management: {},
          catalogue: {},
          spaces: { manage: true },
        }}
      />
    );

    // allow spacesManager to load spaces
    await nextTick();
    wrapper.update();

    expect(wrapper.find(SpaceAvatar)).toHaveLength(spaces.length);
    expect(wrapper.find(SpaceAvatar)).toMatchSnapshot();
  });
});

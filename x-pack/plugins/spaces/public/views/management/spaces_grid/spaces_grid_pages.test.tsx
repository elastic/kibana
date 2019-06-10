/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
jest.mock('ui/kfetch', () => ({
  kfetch: () => Promise.resolve([]),
}));
import React from 'react';
import { mountWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';
import { SpaceAvatar } from '../../../components';
import { SpacesManager } from '../../../lib';
import { SpacesNavState } from '../../nav_control';
import { SpacesGridPage } from './spaces_grid_page';

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
      shallowWithIntl(
        <SpacesGridPage.WrappedComponent
          spacesManager={spacesManager}
          spacesNavState={spacesNavState}
          intl={null as any}
        />
      )
    ).toMatchSnapshot();
  });

  it('renders the list of spaces', async () => {
    const wrapper = mountWithIntl(
      <SpacesGridPage.WrappedComponent
        spacesManager={spacesManager}
        spacesNavState={spacesNavState}
        intl={null as any}
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

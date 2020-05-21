/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ScopedHistory } from 'kibana/public';
import { mountWithIntl, shallowWithIntl, nextTick } from 'test_utils/enzyme_helpers';
import { SpaceAvatar } from '../../space_avatar';
import { spacesManagerMock } from '../../spaces_manager/mocks';
import { SpacesManager } from '../../spaces_manager';
import { SpacesGridPage } from './spaces_grid_page';
import { httpServiceMock, scopedHistoryMock } from 'src/core/public/mocks';
import { notificationServiceMock } from 'src/core/public/mocks';
import { featuresPluginMock } from '../../../../features/public/mocks';
import { Feature } from '../../../../features/public';

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

const featuresStart = featuresPluginMock.createStart();
featuresStart.getFeatures.mockResolvedValue([
  new Feature({
    id: 'feature-1',
    name: 'feature 1',
    icon: 'spacesApp',
    app: [],
    privileges: null,
  }),
]);

describe('SpacesGridPage', () => {
  const getUrlForApp = (appId: string) => appId;
  const history = (scopedHistoryMock.create() as unknown) as ScopedHistory;

  it('renders as expected', () => {
    const httpStart = httpServiceMock.createStartContract();
    httpStart.get.mockResolvedValue([]);

    expect(
      shallowWithIntl(
        <SpacesGridPage
          spacesManager={(spacesManager as unknown) as SpacesManager}
          getFeatures={featuresStart.getFeatures}
          notifications={notificationServiceMock.createStartContract()}
          securityEnabled={true}
          getUrlForApp={getUrlForApp}
          history={history}
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
        getFeatures={featuresStart.getFeatures}
        notifications={notificationServiceMock.createStartContract()}
        securityEnabled={true}
        getUrlForApp={getUrlForApp}
        history={history}
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

  it('notifies when spaces fail to load', async () => {
    const httpStart = httpServiceMock.createStartContract();
    httpStart.get.mockResolvedValue([]);

    const error = new Error('something awful happened');
    spacesManager.getSpaces.mockRejectedValue(error);

    const notifications = notificationServiceMock.createStartContract();

    const wrapper = mountWithIntl(
      <SpacesGridPage
        spacesManager={(spacesManager as unknown) as SpacesManager}
        getFeatures={featuresStart.getFeatures}
        notifications={notifications}
        securityEnabled={true}
        getUrlForApp={getUrlForApp}
        history={history}
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

    expect(wrapper.find(SpaceAvatar)).toHaveLength(0);
    expect(notifications.toasts.addError).toHaveBeenCalledWith(error, {
      title: 'Error loading spaces',
    });
  });

  it('notifies when features fail to load', async () => {
    const httpStart = httpServiceMock.createStartContract();
    httpStart.get.mockResolvedValue([]);

    const error = new Error('something awful happened');

    const notifications = notificationServiceMock.createStartContract();

    const wrapper = mountWithIntl(
      <SpacesGridPage
        spacesManager={(spacesManager as unknown) as SpacesManager}
        getFeatures={() => Promise.reject(error)}
        notifications={notifications}
        securityEnabled={true}
        getUrlForApp={getUrlForApp}
        history={history}
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

    expect(wrapper.find(SpaceAvatar)).toHaveLength(0);
    // For end-users, the effect is that spaces won't load, even though this was a request to retrieve features.
    expect(notifications.toasts.addError).toHaveBeenCalledWith(error, {
      title: 'Error loading spaces',
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from '@testing-library/react';
import React from 'react';

import {
  httpServiceMock,
  notificationServiceMock,
  scopedHistoryMock,
} from '@kbn/core/public/mocks';
import { KibanaFeature } from '@kbn/features-plugin/public';
import { featuresPluginMock } from '@kbn/features-plugin/public/mocks';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import { SpaceAvatarInternal } from '../../space_avatar/space_avatar_internal';
import type { SpacesManager } from '../../spaces_manager';
import { spacesManagerMock } from '../../spaces_manager/mocks';
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

const spacesManager = spacesManagerMock.create();
spacesManager.getSpaces = jest.fn().mockResolvedValue(spaces);

const featuresStart = featuresPluginMock.createStart();
featuresStart.getFeatures.mockResolvedValue([
  new KibanaFeature({
    id: 'feature-1',
    name: 'feature 1',
    app: [],
    category: { id: 'foo', label: 'foo' },
    privileges: null,
  }),
]);

describe('SpacesGridPage', () => {
  const getUrlForApp = (appId: string) => appId;
  const history = scopedHistoryMock.create();

  it('renders the list of spaces', async () => {
    const httpStart = httpServiceMock.createStartContract();
    httpStart.get.mockResolvedValue([]);

    const wrapper = mountWithIntl(
      <SpacesGridPage
        spacesManager={spacesManager as unknown as SpacesManager}
        getFeatures={featuresStart.getFeatures}
        notifications={notificationServiceMock.createStartContract()}
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

    // allow spacesManager to load spaces and lazy-load SpaceAvatar
    await act(async () => {});
    wrapper.update();

    expect(wrapper.find(SpaceAvatarInternal)).toHaveLength(spaces.length);
  });

  it('notifies when spaces fail to load', async () => {
    const httpStart = httpServiceMock.createStartContract();
    httpStart.get.mockResolvedValue([]);

    const error = new Error('something awful happened');
    spacesManager.getSpaces.mockRejectedValue(error);

    const notifications = notificationServiceMock.createStartContract();

    const wrapper = mountWithIntl(
      <SpacesGridPage
        spacesManager={spacesManager as unknown as SpacesManager}
        getFeatures={featuresStart.getFeatures}
        notifications={notifications}
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

    // allow spacesManager to load spaces and lazy-load SpaceAvatar
    await act(async () => {});
    wrapper.update();

    expect(wrapper.find(SpaceAvatarInternal)).toHaveLength(0);
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
        spacesManager={spacesManager as unknown as SpacesManager}
        getFeatures={() => Promise.reject(error)}
        notifications={notifications}
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

    // allow spacesManager to load spaces and lazy-load SpaceAvatar
    await act(async () => {});
    wrapper.update();

    expect(wrapper.find(SpaceAvatarInternal)).toHaveLength(0);
    // For end-users, the effect is that spaces won't load, even though this was a request to retrieve features.
    expect(notifications.toasts.addError).toHaveBeenCalledWith(error, {
      title: 'Error loading spaces',
    });
  });
});

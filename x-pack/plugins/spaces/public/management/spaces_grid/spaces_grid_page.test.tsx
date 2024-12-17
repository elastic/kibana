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
import { mountWithIntl, shallowWithIntl } from '@kbn/test-jest-helpers';

import { SpacesGridPage } from './spaces_grid_page';
import { SpaceAvatarInternal } from '../../space_avatar/space_avatar_internal';
import { spacesManagerMock } from '../../spaces_manager/mocks';

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

const spacesGridCommonProps = {
  serverBasePath: '',
  maxSpaces: 1000,
};

describe('SpacesGridPage', () => {
  const getUrlForApp = (appId: string) => appId;
  const history = scopedHistoryMock.create();

  it('renders the list of spaces', async () => {
    const httpStart = httpServiceMock.createStartContract();
    httpStart.get.mockResolvedValue([]);

    const wrapper = shallowWithIntl(
      <SpacesGridPage
        spacesManager={spacesManager}
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
        allowSolutionVisibility={false}
        {...spacesGridCommonProps}
      />
    );

    // allow spacesManager to load spaces and lazy-load SpaceAvatar
    await act(async () => {});
    wrapper.update();

    expect(wrapper.find('EuiInMemoryTable').prop('items')).toBe(spaces);
    expect(wrapper.find('EuiInMemoryTable').prop('columns')).not.toContainEqual({
      field: 'solution',
      name: 'Solution view',
      sortable: true,
      render: expect.any(Function),
    });
  });

  it('renders the list of spaces with solution column', async () => {
    const httpStart = httpServiceMock.createStartContract();
    httpStart.get.mockResolvedValue([]);
    const spacesWithSolution = [
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
        solution: 'es',
      },
      {
        id: 'custom-2',
        name: 'Custom 2',
        initials: 'LG',
        color: '#ABCDEF',
        description: 'my description here',
        disabledFeatures: [],
        solution: 'security',
      },
    ];

    spacesManager.getSpaces = jest.fn().mockResolvedValue(spacesWithSolution);

    const wrapper = shallowWithIntl(
      <SpacesGridPage
        spacesManager={spacesManager}
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
        allowSolutionVisibility
        {...spacesGridCommonProps}
      />
    );

    // allow spacesManager to load spaces and lazy-load SpaceAvatar
    await act(async () => {});
    wrapper.update();

    expect(wrapper.find('EuiInMemoryTable').prop('items')).toBe(spacesWithSolution);
    expect(wrapper.find('EuiInMemoryTable').prop('columns')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: '', field: 'initials' }),
        expect.objectContaining({ name: 'Space', field: 'name' }),
        expect.objectContaining({ name: 'Description', field: 'description' }),
        expect.objectContaining({ name: 'Solution view', field: 'solution' }),
        expect.objectContaining({
          actions: expect.arrayContaining([
            expect.objectContaining({ name: 'Edit', icon: 'pencil' }),
            expect.objectContaining({ name: 'Switch', icon: 'merge' }),
            expect.objectContaining({ name: 'Delete', icon: 'trash' }),
          ]),
        }),
      ])
    );
  });

  it('renders a "current" badge for the current space', async () => {
    const spacesWithCurrent = [
      { id: 'default', name: 'Default', disabledFeatures: [], _reserved: true },
      { id: 'test-1', name: 'Test', disabledFeatures: [] },
      { id: 'test-2', name: 'Test', disabledFeatures: [] },
    ];
    const spacesManagerWithCurrent = spacesManagerMock.create();
    spacesManagerWithCurrent.getSpaces = jest.fn().mockResolvedValue(spacesWithCurrent);
    spacesManagerWithCurrent.getActiveSpace.mockResolvedValue(spacesWithCurrent[2]);

    const current = await spacesManagerWithCurrent.getActiveSpace();
    expect(current.id).toBe('test-2');

    const wrapper = mountWithIntl(
      <SpacesGridPage
        spacesManager={spacesManagerWithCurrent}
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
        allowSolutionVisibility
        {...spacesGridCommonProps}
      />
    );

    // allow spacesManager to load spaces and lazy-load SpaceAvatar
    await act(async () => {});
    wrapper.update();

    const activeRow = wrapper.find('[data-test-subj="spacesListTableRow-test-2"]');
    const nameCell = activeRow.find('[data-test-subj="spacesListTableRowNameCell"]');
    const activeBadge = nameCell.find('EuiBadge');
    expect(activeBadge.text()).toBe('current');

    // ensure that current badge appears only once
    const currentBadges = wrapper.findWhere((node) => {
      return (
        node.type() === 'span' &&
        node.prop('data-test-subj') &&
        node.prop('data-test-subj').includes('spacesListCurrentBadge')
      );
    });
    expect(currentBadges.length).toBe(1);
  });

  it('renders a non-clickable "switch" action for the current space', async () => {
    spacesManager.getActiveSpace.mockResolvedValue(spaces[2]);
    const current = await spacesManager.getActiveSpace();
    expect(current.id).toBe('custom-2');

    const wrapper = mountWithIntl(
      <SpacesGridPage
        spacesManager={spacesManager}
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
        allowSolutionVisibility
        {...spacesGridCommonProps}
      />
    );

    // allow spacesManager to load spaces and lazy-load SpaceAvatar
    await act(async () => {});
    wrapper.update();

    const activeRow = wrapper.find('[data-test-subj="spacesListTableRow-custom-2"]');
    const switchAction = activeRow.find('EuiButtonIcon[data-test-subj="custom-2-switchSpace"]');
    expect(switchAction.prop('isDisabled')).toBe(true);
  });

  it('renders a clickable "switch" action for the non-current space', async () => {
    spacesManager.getActiveSpace.mockResolvedValue(spaces[2]);
    const current = await spacesManager.getActiveSpace();
    expect(current.id).toBe('custom-2');

    const wrapper = mountWithIntl(
      <SpacesGridPage
        spacesManager={spacesManager}
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
        allowSolutionVisibility
        {...spacesGridCommonProps}
      />
    );

    // allow spacesManager to load spaces and lazy-load SpaceAvatar
    await act(async () => {});
    wrapper.update();

    const nonActiveRow = wrapper.find('[data-test-subj="spacesListTableRow-default"]');
    const switchAction = nonActiveRow.find('EuiButtonIcon[data-test-subj="default-switchSpace"]');
    expect(switchAction.prop('isDisabled')).toBe(false);
  });

  it('renders a create spaces button', async () => {
    const httpStart = httpServiceMock.createStartContract();
    httpStart.get.mockResolvedValue([]);

    const wrapper = mountWithIntl(
      <SpacesGridPage
        spacesManager={spacesManager}
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
        allowSolutionVisibility
        {...spacesGridCommonProps}
      />
    );

    // allow spacesManager to load spaces and lazy-load SpaceAvatar
    await act(async () => {});
    wrapper.update();

    expect(wrapper.find({ 'data-test-subj': 'createSpace' }).length).toBeTruthy();
    expect(wrapper.find('EuiCallOut')).toHaveLength(0);
  });

  it('does not render a create spaces button when limit has been reached', async () => {
    const httpStart = httpServiceMock.createStartContract();
    httpStart.get.mockResolvedValue([]);

    const wrapper = mountWithIntl(
      <SpacesGridPage
        spacesManager={spacesManager}
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
        maxSpaces={1}
        allowSolutionVisibility
        serverBasePath={spacesGridCommonProps.serverBasePath}
      />
    );

    // allow spacesManager to load spaces and lazy-load SpaceAvatar
    await act(async () => {});
    wrapper.update();

    expect(wrapper.find({ 'data-test-subj': 'createSpace' }).length).toBeFalsy();
    expect(wrapper.find('EuiCallOut')).toHaveLength(1);
  });

  it('notifies when spaces fail to load', async () => {
    const httpStart = httpServiceMock.createStartContract();
    httpStart.get.mockResolvedValue([]);

    const error = new Error('something awful happened');
    spacesManager.getSpaces.mockRejectedValue(error);

    const notifications = notificationServiceMock.createStartContract();

    const wrapper = shallowWithIntl(
      <SpacesGridPage
        spacesManager={spacesManager}
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
        allowSolutionVisibility
        {...spacesGridCommonProps}
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

    const wrapper = shallowWithIntl(
      <SpacesGridPage
        spacesManager={spacesManager}
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
        allowSolutionVisibility
        {...spacesGridCommonProps}
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

  it(`does not render the 'Features visible' column when serverless`, async () => {
    const httpStart = httpServiceMock.createStartContract();
    httpStart.get.mockResolvedValue([]);

    const error = new Error('something awful happened');

    const notifications = notificationServiceMock.createStartContract();

    const wrapper = shallowWithIntl(
      <SpacesGridPage
        spacesManager={spacesManager}
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
        allowSolutionVisibility
        {...spacesGridCommonProps}
      />
    );

    // allow spacesManager to load spaces and lazy-load SpaceAvatar
    await act(async () => {});
    wrapper.update();

    expect(wrapper.find('EuiInMemoryTable').prop('columns')).not.toContainEqual(
      expect.objectContaining({
        field: 'disabledFeatures',
        name: 'Features visible',
      })
    );
  });
});

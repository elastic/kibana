/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from '@testing-library/react';
import React from 'react';

import { mountWithIntl } from '@kbn/test-jest-helpers';
import { coreMock } from 'src/core/public/mocks';

import { SpaceAvatarInternal } from '../../../../../../../../spaces/public/space_avatar/space_avatar_internal';
import { spacesManagerMock } from '../../../../../../../../spaces/public/spaces_manager/mocks';
import { getUiApi } from '../../../../../../../../spaces/public/ui_api';
import type { RoleKibanaPrivilege } from '../../../../../../../common/model';
import { SpacesPopoverList } from '../../../spaces_popover_list';
import { SpaceColumnHeader } from './space_column_header';

const spaces = [
  {
    id: '*',
    name: 'Global',
    disabledFeatures: [],
  },
  {
    id: 'space-1',
    name: 'Space 1',
    disabledFeatures: [],
  },
  {
    id: 'space-2',
    name: 'Space 2',
    disabledFeatures: [],
  },
  {
    id: 'space-3',
    name: 'Space 3',
    disabledFeatures: [],
  },
  {
    id: 'space-4',
    name: 'Space 4',
    disabledFeatures: [],
  },
  {
    id: 'space-5',
    name: 'Space 5',
    disabledFeatures: [],
  },
];
const spacesManager = spacesManagerMock.create();
const { getStartServices } = coreMock.createSetup();
const spacesApiUi = getUiApi({ spacesManager, getStartServices });

describe('SpaceColumnHeader', () => {
  async function setup(entry: RoleKibanaPrivilege) {
    const wrapper = mountWithIntl(
      <SpaceColumnHeader spaces={spaces} entry={entry} spacesApiUi={spacesApiUi} />
    );

    await act(async () => {});

    // lazy-load SpaceAvatar
    await act(async () => {
      wrapper.update();
    });

    return wrapper;
  }

  it('renders the Global privilege definition with a special label', async () => {
    const wrapper = await setup({
      base: [],
      feature: {},
      spaces: ['*'],
    });

    // Snapshot includes space avatar (The first "G"), followed by the "Global" label,
    // followed by the (all spaces) text as part of the SpacesPopoverList
    expect(wrapper.text()).toMatchInlineSnapshot(`"G All Spaces"`);
  });

  it('renders a placeholder space when the requested space no longer exists', async () => {
    const wrapper = await setup({
      base: [],
      feature: {},
      spaces: ['space-1', 'missing-space', 'space-3'],
    });

    expect(wrapper.find(SpacesPopoverList)).toHaveLength(0);

    const avatars = wrapper.find(SpaceAvatarInternal);
    expect(avatars).toHaveLength(3);

    expect(wrapper.text()).toMatchInlineSnapshot(`"S1 m S3 "`);
  });

  it('renders a space privilege definition with an avatar for each space in the group', async () => {
    const wrapper = await setup({
      base: [],
      feature: {},
      spaces: ['space-1', 'space-2', 'space-3', 'space-4'],
    });

    expect(wrapper.find(SpacesPopoverList)).toHaveLength(0);

    const avatars = wrapper.find(SpaceAvatarInternal);
    expect(avatars).toHaveLength(4);

    expect(wrapper.text()).toMatchInlineSnapshot(`"S1 S2 S3 S4 "`);
  });

  it('renders a space privilege definition with an avatar for the first 4 spaces in the group, with the popover control showing the rest', async () => {
    const wrapper = await setup({
      base: [],
      feature: {},
      spaces: ['space-1', 'space-2', 'space-3', 'space-4', 'space-5'],
    });

    expect(wrapper.find(SpacesPopoverList)).toHaveLength(1);

    const avatars = wrapper.find(SpaceAvatarInternal);
    expect(avatars).toHaveLength(4);

    expect(wrapper.text()).toMatchInlineSnapshot(`"S1 S2 S3 S4 +1 more"`);
  });
});

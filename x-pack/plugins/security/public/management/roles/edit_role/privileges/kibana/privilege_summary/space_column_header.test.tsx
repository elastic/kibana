/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import { SpaceColumnHeader } from './space_column_header';
import { SpacesPopoverList } from '../../../spaces_popover_list';
import { SpaceAvatar } from '../../../../../../../../spaces/public';

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

describe('SpaceColumnHeader', () => {
  it('renders the Global privilege definition with a special label', () => {
    const wrapper = mountWithIntl(
      <SpaceColumnHeader
        spaces={spaces}
        entry={{
          base: [],
          feature: {},
          spaces: ['*'],
        }}
      />
    );

    // Snapshot includes space avatar (The first "G"), followed by the "Global" label,
    // followed by the (all spaces) text as part of the SpacesPopoverList
    expect(wrapper.text()).toMatchInlineSnapshot(`"G All Spaces"`);
  });

  it('renders a placeholder space when the requested space no longer exists', () => {
    const wrapper = mountWithIntl(
      <SpaceColumnHeader
        spaces={spaces}
        entry={{
          base: [],
          feature: {},
          spaces: ['space-1', 'missing-space', 'space-3'],
        }}
      />
    );

    expect(wrapper.find(SpacesPopoverList)).toHaveLength(0);

    const avatars = wrapper.find(SpaceAvatar);
    expect(avatars).toHaveLength(3);

    expect(wrapper.text()).toMatchInlineSnapshot(`"S1 m S3 "`);
  });

  it('renders a space privilege definition with an avatar for each space in the group', () => {
    const wrapper = mountWithIntl(
      <SpaceColumnHeader
        spaces={spaces}
        entry={{
          base: [],
          feature: {},
          spaces: ['space-1', 'space-2', 'space-3', 'space-4'],
        }}
      />
    );

    expect(wrapper.find(SpacesPopoverList)).toHaveLength(0);

    const avatars = wrapper.find(SpaceAvatar);
    expect(avatars).toHaveLength(4);

    expect(wrapper.text()).toMatchInlineSnapshot(`"S1 S2 S3 S4 "`);
  });

  it('renders a space privilege definition with an avatar for the first 4 spaces in the group, with the popover control showing the rest', () => {
    const wrapper = mountWithIntl(
      <SpaceColumnHeader
        spaces={spaces}
        entry={{
          base: [],
          feature: {},
          spaces: ['space-1', 'space-2', 'space-3', 'space-4', 'space-5'],
        }}
      />
    );

    expect(wrapper.find(SpacesPopoverList)).toHaveLength(1);

    const avatars = wrapper.find(SpaceAvatar);
    expect(avatars).toHaveLength(4);

    expect(wrapper.text()).toMatchInlineSnapshot(`"S1 S2 S3 S4 +1 more"`);
  });
});

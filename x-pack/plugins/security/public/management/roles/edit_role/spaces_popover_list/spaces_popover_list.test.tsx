/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiContextMenuPanel,
  EuiFieldSearch,
  EuiPopover,
  EuiSelectable,
  EuiSelectableListItem,
} from '@elastic/eui';
import { act } from '@testing-library/react';
import React from 'react';

import { coreMock } from '@kbn/core/public/mocks';
import type { Space } from '@kbn/spaces-plugin/public';
import { SpaceAvatarInternal } from '@kbn/spaces-plugin/public/space_avatar/space_avatar_internal';
import { spacesManagerMock } from '@kbn/spaces-plugin/public/spaces_manager/mocks';
import { getUiApi } from '@kbn/spaces-plugin/public/ui_api';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import { SpacesPopoverList } from './spaces_popover_list';

const mockSpaces = [
  {
    id: 'default',
    name: 'Default Space',
    description: 'this is your default space',
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
];
const spacesManager = spacesManagerMock.create();
const { getStartServices } = coreMock.createSetup();
const spacesApiUi = getUiApi({ spacesManager, getStartServices });

describe('SpacesPopoverList', () => {
  async function setup(spaces: Space[]) {
    const wrapper = mountWithIntl(
      <SpacesPopoverList spaces={spaces} buttonText="hello world" spacesApiUi={spacesApiUi} />
    );

    // lazy-load SpaceAvatar
    await act(async () => {
      wrapper.update();
    });

    return wrapper;
  }

  it('renders a button with the provided text', async () => {
    const wrapper = await setup(mockSpaces);
    expect(wrapper.find(EuiButtonEmpty).text()).toEqual('hello world');
    expect(wrapper.find(EuiContextMenuPanel)).toHaveLength(0);
  });

  it('clicking the button renders an EuiSelectable menu with the provided spaces', async () => {
    const wrapper = await setup(mockSpaces);
    await act(async () => {
      wrapper.find(EuiButtonEmpty).simulate('click');
    });
    wrapper.update();

    await act(async () => {
      const menu = wrapper.find(EuiSelectable);
      expect(menu).toHaveLength(1);

      const items = menu.find(EuiSelectableListItem);
      expect(items).toHaveLength(mockSpaces.length);

      mockSpaces.forEach((space, index) => {
        const spaceAvatar = items.at(index).find(SpaceAvatarInternal);
        expect(spaceAvatar.props().space).toEqual(space);
      });
    });
  });

  it('should render a search box when there are 8 or more spaces', async () => {
    const eightSpaces = mockSpaces.concat([
      {
        id: 'space-3',
        name: 'Space-3',
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
      {
        id: 'space-6',
        name: 'Space 6',
        disabledFeatures: [],
      },
      {
        id: 'space-7',
        name: 'Space 7',
        disabledFeatures: [],
      },
    ]);
    const wrapper = await setup(eightSpaces);
    await act(async () => {
      wrapper.find(EuiButtonEmpty).simulate('click');
    });
    wrapper.update();

    expect(wrapper.find(EuiFieldSearch)).toHaveLength(1);
  });

  it('should NOT render a search box when there are less than 8 spaces', async () => {
    const sevenSpaces = mockSpaces.concat([
      {
        id: 'space-3',
        name: 'Space-3',
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
      {
        id: 'space-6',
        name: 'Space 6',
        disabledFeatures: [],
      },
    ]);

    const wrapper = await setup(sevenSpaces);
    await act(async () => {
      wrapper.find(EuiButtonEmpty).simulate('click');
    });
    wrapper.update();

    expect(wrapper.find(EuiFieldSearch)).toHaveLength(0);
  });

  it('can close its popover', async () => {
    const wrapper = await setup(mockSpaces);
    await act(async () => {
      wrapper.find(EuiButtonEmpty).simulate('click');
    });
    wrapper.update();
    expect(wrapper.find(EuiPopover).props().isOpen).toEqual(true);

    await act(async () => {
      wrapper.find(EuiPopover).props().closePopover();
    });
    wrapper.update();

    expect(wrapper.find(EuiPopover).props().isOpen).toEqual(false);
  });
});

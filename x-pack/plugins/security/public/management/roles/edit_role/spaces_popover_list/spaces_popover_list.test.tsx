/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFieldSearch,
  EuiPopover,
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

  it('clicking the button renders a context menu with the provided spaces', async () => {
    const wrapper = await setup(mockSpaces);
    await act(async () => {
      wrapper.find(EuiButtonEmpty).simulate('click');
    });
    wrapper.update();

    const menu = wrapper.find(EuiContextMenuPanel);
    expect(menu).toHaveLength(1);

    const items = menu.find(EuiContextMenuItem);
    expect(items).toHaveLength(mockSpaces.length);

    mockSpaces.forEach((space, index) => {
      const spaceAvatar = items.at(index).find(SpaceAvatarInternal);
      expect(spaceAvatar.props().space).toEqual(space);
    });
  });

  it('Should NOT render a search box when there is less than 8 spaces', async () => {
    const wrapper = await setup(mockSpaces);
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

    wrapper.find(EuiPopover).props().closePopover();

    wrapper.update();

    expect(wrapper.find(EuiPopover).props().isOpen).toEqual(false);
  });
});

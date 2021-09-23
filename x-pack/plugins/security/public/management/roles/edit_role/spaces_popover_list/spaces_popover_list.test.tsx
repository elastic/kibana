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

import { mountWithIntl } from '@kbn/test/jest';
import { coreMock } from 'src/core/public/mocks';

import type { Space } from '../../../../../../spaces/public';
import { SpaceAvatarInternal } from '../../../../../../spaces/public/space_avatar/space_avatar_internal';
import { spacesManagerMock } from '../../../../../../spaces/public/spaces_manager/mocks';
import { getUiApi } from '../../../../../../spaces/public/ui_api';
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

// FLAKY: https://github.com/elastic/kibana/issues/101454
describe.skip('SpacesPopoverList', () => {
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

    expect(wrapper.find(EuiFieldSearch)).toHaveLength(0);
  });

  it('renders a search box when there are 8 or more spaces', async () => {
    const lotsOfSpaces = [1, 2, 3, 4, 5, 6, 7, 8].map((num) => ({
      id: `space-${num}`,
      name: `Space ${num}`,
      disabledFeatures: [],
    }));

    const wrapper = await setup(lotsOfSpaces);
    await act(async () => {
      wrapper.find(EuiButtonEmpty).simulate('click');
    });
    wrapper.update();

    const menu = wrapper.find(EuiContextMenuPanel).first();
    const items = menu.find(EuiContextMenuItem);
    expect(items).toHaveLength(lotsOfSpaces.length);

    const searchField = wrapper.find(EuiFieldSearch);
    expect(searchField).toHaveLength(1);

    searchField.props().onSearch!('Space 6');
    await act(async () => {});
    wrapper.update();
    expect(wrapper.find(SpaceAvatarInternal)).toHaveLength(1);

    searchField.props().onSearch!('this does not match');
    wrapper.update();
    expect(wrapper.find(SpaceAvatarInternal)).toHaveLength(0);

    const updatedMenu = wrapper.find(EuiContextMenuPanel).first();
    expect(updatedMenu.text()).toMatchInlineSnapshot(`"Spaces no spaces found "`);
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

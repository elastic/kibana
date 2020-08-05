/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { SpacesPopoverList } from '.';
import {
  EuiButtonEmpty,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiFieldSearch,
  EuiPopover,
} from '@elastic/eui';
import { SpaceAvatar } from '../../../../../../spaces/public';

const spaces = [
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

describe('SpacesPopoverList', () => {
  it('renders a button with the provided text', () => {
    const wrapper = mountWithIntl(<SpacesPopoverList spaces={spaces} buttonText="hello world" />);
    expect(wrapper.find(EuiButtonEmpty).text()).toEqual('hello world');
    expect(wrapper.find(EuiContextMenuPanel)).toHaveLength(0);
  });

  it('clicking the button renders a context menu with the provided spaces', () => {
    const wrapper = mountWithIntl(<SpacesPopoverList spaces={spaces} buttonText="hello world" />);
    wrapper.find(EuiButtonEmpty).simulate('click');
    wrapper.update();

    const menu = wrapper.find(EuiContextMenuPanel);
    expect(menu).toHaveLength(1);

    const items = menu.find(EuiContextMenuItem);
    expect(items).toHaveLength(spaces.length);

    spaces.forEach((space, index) => {
      const spaceAvatar = items.at(index).find(SpaceAvatar);
      expect(spaceAvatar.props().space).toEqual(space);
    });

    expect(wrapper.find(EuiFieldSearch)).toHaveLength(0);
  });

  it('renders a search box when there are 8 or more spaces', () => {
    const lotsOfSpaces = [1, 2, 3, 4, 5, 6, 7, 8].map((num) => ({
      id: `space-${num}`,
      name: `Space ${num}`,
      disabledFeatures: [],
    }));

    const wrapper = mountWithIntl(
      <SpacesPopoverList spaces={lotsOfSpaces} buttonText="hello world" />
    );
    wrapper.find(EuiButtonEmpty).simulate('click');
    wrapper.update();

    const menu = wrapper.find(EuiContextMenuPanel).first();
    const items = menu.find(EuiContextMenuItem);
    expect(items).toHaveLength(lotsOfSpaces.length);

    const searchField = wrapper.find(EuiFieldSearch);
    expect(searchField).toHaveLength(1);

    searchField.props().onSearch!('Space 6');
    wrapper.update();
    expect(wrapper.find(SpaceAvatar)).toHaveLength(1);

    searchField.props().onSearch!('this does not match');
    wrapper.update();
    expect(wrapper.find(SpaceAvatar)).toHaveLength(0);

    const updatedMenu = wrapper.find(EuiContextMenuPanel).first();
    expect(updatedMenu.text()).toMatchInlineSnapshot(`"Spaces no spaces found "`);
  });

  it('can close its popover', () => {
    const wrapper = mountWithIntl(<SpacesPopoverList spaces={spaces} buttonText="hello world" />);
    wrapper.find(EuiButtonEmpty).simulate('click');
    wrapper.update();

    expect(wrapper.find(EuiPopover).props().isOpen).toEqual(true);

    wrapper.find(EuiPopover).props().closePopover();

    wrapper.update();

    expect(wrapper.find(EuiPopover).props().isOpen).toEqual(false);
  });
});

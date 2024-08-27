/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFieldSearch,
  EuiHeaderSectionItemButton,
  EuiPopover,
  EuiSelectable,
  EuiSelectableListItem,
} from '@elastic/eui';
import { act, render, waitFor } from '@testing-library/react';
import React from 'react';
import * as Rx from 'rxjs';

import { findTestSubject, mountWithIntl } from '@kbn/test-jest-helpers';

import { NavControlPopover } from './nav_control_popover';
import type { Space } from '../../common';
import { EventTracker } from '../analytics';
import { SpaceAvatarInternal } from '../space_avatar/space_avatar_internal';
import { SpaceSolutionBadge } from '../space_solution_badge';
import type { SpacesManager } from '../spaces_manager';
import { spacesManagerMock } from '../spaces_manager/mocks';

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

const reportEvent = jest.fn();
const eventTracker = new EventTracker({ reportEvent });

describe('NavControlPopover', () => {
  async function setup(spaces: Space[], allowSolutionVisibility = false, activeSpace?: Space) {
    const spacesManager = spacesManagerMock.create();
    spacesManager.getSpaces = jest.fn().mockResolvedValue(spaces);

    if (activeSpace) {
      // @ts-ignore readonly check
      spacesManager.onActiveSpaceChange$ = Rx.of(activeSpace);
    }

    const wrapper = mountWithIntl(
      <NavControlPopover
        spacesManager={spacesManager as unknown as SpacesManager}
        serverBasePath={'/server-base-path'}
        anchorPosition={'rightCenter'}
        capabilities={{ navLinks: {}, management: {}, catalogue: {}, spaces: { manage: true } }}
        navigateToApp={jest.fn()}
        navigateToUrl={jest.fn()}
        allowSolutionVisibility={allowSolutionVisibility}
        eventTracker={eventTracker}
      />
    );

    await waitFor(() => {
      wrapper.update();
    });

    return wrapper;
  }

  it('renders without crashing', () => {
    const spacesManager = spacesManagerMock.create();

    const { baseElement } = render(
      <NavControlPopover
        spacesManager={spacesManager as unknown as SpacesManager}
        serverBasePath={'/server-base-path'}
        anchorPosition={'downRight'}
        capabilities={{ navLinks: {}, management: {}, catalogue: {}, spaces: { manage: true } }}
        navigateToApp={jest.fn()}
        navigateToUrl={jest.fn()}
        allowSolutionVisibility={false}
        eventTracker={eventTracker}
      />
    );
    expect(baseElement).toMatchSnapshot();
  });

  it('renders a SpaceAvatar with the active space', async () => {
    const spacesManager = spacesManagerMock.create();
    spacesManager.getSpaces = jest.fn().mockResolvedValue(mockSpaces);
    // @ts-ignore readonly check
    spacesManager.onActiveSpaceChange$ = Rx.of({
      id: 'default',
      name: 'Default Space',
      description: 'this is your default space',
      disabledFeatures: [],
    });

    const wrapper = mountWithIntl(
      <NavControlPopover
        spacesManager={spacesManager as unknown as SpacesManager}
        serverBasePath={'/server-base-path'}
        anchorPosition={'rightCenter'}
        capabilities={{ navLinks: {}, management: {}, catalogue: {}, spaces: { manage: true } }}
        navigateToApp={jest.fn()}
        navigateToUrl={jest.fn()}
        allowSolutionVisibility={false}
        eventTracker={eventTracker}
      />
    );

    wrapper.find(EuiHeaderSectionItemButton).find('button').simulate('click');

    // Wait for `getSpaces` promise to resolve
    await waitFor(() => {
      wrapper.update();
      expect(wrapper.find(SpaceAvatarInternal)).toHaveLength(mockSpaces.length + 1); // one additional avatar for the button itself
    });
  });

  it('clicking the button renders an EuiSelectable menu with the provided spaces', async () => {
    const wrapper = await setup(mockSpaces);

    await act(async () => {
      wrapper.find(EuiHeaderSectionItemButton).find('button').simulate('click');
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
      wrapper.find(EuiHeaderSectionItemButton).find('button').simulate('click');
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
      wrapper.find(EuiHeaderSectionItemButton).find('button').simulate('click');
    });
    wrapper.update();

    expect(wrapper.find(EuiFieldSearch)).toHaveLength(0);
  });

  it('can close its popover', async () => {
    const wrapper = await setup(mockSpaces);

    await act(async () => {
      wrapper.find(EuiHeaderSectionItemButton).find('button').simulate('click');
    });
    wrapper.update();
    expect(wrapper.find(EuiPopover).props().isOpen).toEqual(true);

    await act(async () => {
      wrapper.find(EuiPopover).props().closePopover();
    });
    wrapper.update();

    expect(wrapper.find(EuiPopover).props().isOpen).toEqual(false);
  });

  it('should render solution for spaces', async () => {
    const spaces: Space[] = [
      {
        id: 'space-1',
        name: 'Space-1',
        disabledFeatures: [],
        solution: 'classic',
      },
      {
        id: 'space-2',
        name: 'Space 2',
        disabledFeatures: [],
        solution: 'security',
      },
    ];

    const wrapper = await setup(spaces, true /** isSolutionEnabled **/);

    await act(async () => {
      wrapper.find(EuiHeaderSectionItemButton).find('button').simulate('click');
    });

    wrapper.update();

    expect(wrapper.find(SpaceSolutionBadge)).toHaveLength(2);
  });

  it('should report event when switching space', async () => {
    const spaces: Space[] = [
      {
        id: 'space-1',
        name: 'Space-1',
        disabledFeatures: [],
        solution: 'classic',
      },
      {
        id: 'space-2',
        name: 'Space 2',
        disabledFeatures: [],
        solution: 'security',
      },
    ];

    const activeSpace = spaces[0];
    const wrapper = await setup(spaces, true /** allowSolutionVisibility **/, activeSpace);

    await act(async () => {
      wrapper.find(EuiHeaderSectionItemButton).find('button').simulate('click');
    });
    wrapper.update();

    expect(reportEvent).not.toHaveBeenCalled();

    findTestSubject(wrapper, 'space-2-selectableSpaceItem').simulate('click');

    expect(reportEvent).toHaveBeenCalledWith('space_changed', {
      solution: 'security',
      solution_prev: 'classic',
      space_id: 'space-2',
      space_id_prev: 'space-1',
    });
  });
});

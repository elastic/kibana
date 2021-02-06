/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import { shallow } from 'enzyme';
import React from 'react';
import { SpaceAvatar } from '../space_avatar';
import { spacesManagerMock } from '../spaces_manager/mocks';
import { SpacesManager } from '../spaces_manager';
import { NavControlPopover } from './nav_control_popover';
import { EuiHeaderSectionItemButton } from '@elastic/eui';
import { mountWithIntl } from '@kbn/test/jest';
import { waitFor } from '@testing-library/react';

describe('NavControlPopover', () => {
  it('renders without crashing', () => {
    const spacesManager = spacesManagerMock.create();

    const wrapper = shallow(
      <NavControlPopover
        spacesManager={(spacesManager as unknown) as SpacesManager}
        serverBasePath={'/server-base-path'}
        anchorPosition={'downRight'}
        capabilities={{ navLinks: {}, management: {}, catalogue: {}, spaces: { manage: true } }}
        navigateToApp={jest.fn()}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('renders a SpaceAvatar with the active space', async () => {
    const spacesManager = spacesManagerMock.create();
    spacesManager.getSpaces = jest.fn().mockResolvedValue([
      {
        id: 'foo-space',
        name: 'foo',
        disabledFeatures: [],
      },
      {
        id: 'bar-space',
        name: 'bar',
        disabledFeatures: [],
      },
    ]);
    // @ts-ignore readonly check
    spacesManager.onActiveSpaceChange$ = Rx.of({
      id: 'foo-space',
      name: 'foo',
      disabledFeatures: [],
    });

    const wrapper = mountWithIntl(
      <NavControlPopover
        spacesManager={(spacesManager as unknown) as SpacesManager}
        serverBasePath={'/server-base-path'}
        anchorPosition={'rightCenter'}
        capabilities={{ navLinks: {}, management: {}, catalogue: {}, spaces: { manage: true } }}
        navigateToApp={jest.fn()}
      />
    );

    wrapper.find(EuiHeaderSectionItemButton).simulate('click');

    // Wait for `getSpaces` promise to resolve
    await waitFor(() => {
      wrapper.update();
      expect(wrapper.find(SpaceAvatar)).toHaveLength(3);
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';
import { SpaceAvatar } from '../../components';
import { SpacesManager } from '../../lib/spaces_manager';
import { SpacesGlobalNavButton } from './components/spaces_global_nav_button';
import { NavControlPopover } from './nav_control_popover';

const mockChrome = {
  addBasePath: jest.fn((a: string) => a),
};

const createMockHttpAgent = (withSpaces = false) => {
  const spaces = [
    {
      id: '',
      name: 'space 1',
      disabledFeatures: [],
    },
    {
      id: '',
      name: 'space 2',
      disabledFeatures: [],
    },
  ];

  const mockHttpAgent = {
    get: async () => {
      const result = withSpaces ? spaces : [];

      return {
        data: result,
      };
    },
  };
  return mockHttpAgent;
};

describe('NavControlPopover', () => {
  it('renders without crashing', () => {
    const activeSpace = {
      space: { id: '', name: 'foo', disabledFeatures: [] },
      valid: true,
    };

    const spacesManager = new SpacesManager(createMockHttpAgent(), mockChrome, '/');

    const wrapper = shallow(
      <NavControlPopover
        activeSpace={activeSpace}
        spacesManager={spacesManager}
        anchorPosition={'downRight'}
        buttonClass={SpacesGlobalNavButton}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('renders a SpaceAvatar with the active space', async () => {
    const activeSpace = {
      space: { id: '', name: 'foo', disabledFeatures: [] },
      valid: true,
    };

    const mockAgent = createMockHttpAgent(true);

    const spacesManager = new SpacesManager(mockAgent, mockChrome, '/');

    const wrapper = mount<any, any>(
      <NavControlPopover
        activeSpace={activeSpace}
        spacesManager={spacesManager}
        anchorPosition={'rightCenter'}
        buttonClass={SpacesGlobalNavButton}
      />
    );

    return new Promise(resolve => {
      setTimeout(() => {
        expect(wrapper.state().spaces).toHaveLength(2);
        wrapper.update();
        expect(wrapper.find(SpaceAvatar)).toHaveLength(1);
        resolve();
      }, 20);
    });
  });
});

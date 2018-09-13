/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';
import { NavControlPopover } from './nav_control_popover';
import { SpacesManager } from '../../lib/spaces_manager';
import { SpaceAvatar } from '../../components';

const mockChrome = {
  addBasePath: jest.fn((a) => a)
};

const createMockHttpAgent = (withSpaces = false) => {

  const mockHttpAgent = {
    get: async () => {
      const result = withSpaces ? [{
        name: 'space 1'
      }, {
        name: 'space 2'
      }] : [];

      return {
        data: result
      };
    }
  };
  return mockHttpAgent;
};

describe('NavControlPopover', () => {
  it('renders without crashing', () => {
    const activeSpace = {
      space: { name: 'foo' },
      valid: true
    };

    const spacesManager = new SpacesManager(createMockHttpAgent(), mockChrome);

    const wrapper = shallow(<NavControlPopover
      activeSpace={activeSpace}
      spacesManager={spacesManager}
      userProfile={{ hasCapability: () => true }}
    />);
    expect(wrapper).toMatchSnapshot();
  });

  it('renders a SpaceAvatar with the active space', async () => {
    const activeSpace = {
      space: { name: 'foo' },
      valid: true
    };

    const mockAgent = createMockHttpAgent(true);

    const spacesManager = new SpacesManager(mockAgent, mockChrome);

    const wrapper = mount(<NavControlPopover
      activeSpace={activeSpace}
      spacesManager={spacesManager}
      userProfile={{ hasCapability: () => true }}
    />);

    return new Promise((resolve) => {
      setTimeout(() => {
        expect(wrapper.state().spaces).toHaveLength(2);
        wrapper.update();
        expect(wrapper.find(SpaceAvatar)).toHaveLength(1);
        resolve();
      }, 20);
    });
  });
});

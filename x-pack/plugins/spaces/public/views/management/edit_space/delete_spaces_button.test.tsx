/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { SpacesManager } from '../../../lib';
import { SpacesNavState } from '../../nav_control';
import { DeleteSpacesButton } from './delete_spaces_button';

const space = {
  id: 'my-space',
  name: 'My Space',
};
const buildMockChrome = () => {
  return {
    addBasePath: (path: string) => path,
  };
};

describe('DeleteSpacesButton', () => {
  it('renders as expected', () => {
    const mockHttp = {
      delete: jest.fn(() => Promise.resolve()),
    };
    const mockChrome = buildMockChrome();

    const spacesManager = new SpacesManager(mockHttp, mockChrome, '/');

    const spacesNavState: SpacesNavState = {
      getActiveSpace: () => space,
      refreshSpacesList: jest.fn(),
    };

    const wrapper = shallow(
      <DeleteSpacesButton
        space={space}
        spacesManager={spacesManager}
        spacesNavState={spacesNavState}
        onDelete={jest.fn()}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });
});

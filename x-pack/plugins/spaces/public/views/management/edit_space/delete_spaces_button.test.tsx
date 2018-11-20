/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

<<<<<<< HEAD
import { shallow } from 'enzyme';
import React from 'react';
=======
import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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

<<<<<<< HEAD
    const wrapper = shallow(
      <DeleteSpacesButton
=======
    const wrapper = shallowWithIntl(
      <DeleteSpacesButton.WrappedComponent
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
        space={space}
        spacesManager={spacesManager}
        spacesNavState={spacesNavState}
        onDelete={jest.fn()}
<<<<<<< HEAD
=======
        intl={null as any}
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
      />
    );
    expect(wrapper).toMatchSnapshot();
  });
});

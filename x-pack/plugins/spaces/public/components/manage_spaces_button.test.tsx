/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { shallow } from 'enzyme';
import React from 'react';
import { setMockCapabilities } from 'x-pack/plugins/__mocks__/ui/capabilities';
import { ManageSpacesButton } from './manage_spaces_button';

describe('ManageSpacesButton', () => {
  it('renders as expected', () => {
    setMockCapabilities({
      navLinks: {},
      spaces: {
        manage: true,
      },
    });

    const component = <ManageSpacesButton />;
    expect(shallow(component)).toMatchSnapshot();
  });

  it(`doesn't render if user profile forbids managing spaces`, () => {
    setMockCapabilities({
      navLinks: {},
      spaces: {
        manage: false,
      },
    });

    const component = <ManageSpacesButton />;
    expect(shallow(component)).toMatchSnapshot();
  });
});

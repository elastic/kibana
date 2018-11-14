/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { shallow } from 'enzyme';
import React from 'react';
import { setMockCapabilities } from 'x-pack/plugins/__mocks__/ui/capabilities';
import { SecureSpaceMessage } from './secure_space_message';

describe('SecureSpaceMessage', () => {
  it(`doesn't render if UI Capabilities does not allow security to be managed`, () => {
    setMockCapabilities({
      navLinks: {},
      spaces: { manage: false },
    });
    expect(shallow(<SecureSpaceMessage />)).toMatchSnapshot();
  });

  it(`renders if user profile allows security to be managed`, () => {
    setMockCapabilities({
      navLinks: {},
      spaces: { manage: true },
    });
    expect(shallow(<SecureSpaceMessage />)).toMatchSnapshot();
  });
});

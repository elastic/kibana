/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { SpacesDescription } from './spaces_description';

describe('SpacesDescription', () => {
  it('renders without crashing', () => {
    expect(
      shallow(
        <SpacesDescription
          userProfile={{ hasCapability: () => true }}
          onManageSpacesClick={jest.fn()}
        />
      )
    ).toMatchSnapshot();
  });
});

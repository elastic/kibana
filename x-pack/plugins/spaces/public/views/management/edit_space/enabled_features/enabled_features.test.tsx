/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { EnabledFeatures } from './enabled_features';

describe('EnabledFeatures', () => {
  it(`renders as expected`, () => {
    expect(
      shallowWithIntl<EnabledFeatures>(
        <EnabledFeatures
          features={[
            {
              id: 'some-feature',
              name: 'Some Feature',
              icon: 'discoverApp',
              app: [],
              privileges: {},
            },
          ]}
          space={{
            id: 'my-space',
          }}
          uiCapabilities={{
            navLinks: {},
            management: {},
            catalogue: {},
            spaces: {
              manage: true,
            },
          }}
          intl={null as any}
          onChange={jest.fn()}
        />
      )
    ).toMatchSnapshot();
  });
});

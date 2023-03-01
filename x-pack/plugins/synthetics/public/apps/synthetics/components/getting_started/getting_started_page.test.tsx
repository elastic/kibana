/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../utils/testing/rtl_helpers';
import { GettingStartedPage } from './getting_started_page';

describe('GettingStartedPage', () => {
  it('works with cloud locations', () => {
    const { getByText } = render(<GettingStartedPage />, {
      state: {
        serviceLocations: {
          locations: [
            {
              id: 'us_central',
              label: 'Us Central',
            },
            {
              id: 'us_east',
              label: 'US East',
            },
          ],
          locationsLoaded: true,
          loading: false,
        },
      },
    });

    // page is loaded
    expect(getByText('Create a single page browser monitor')).toBeInTheDocument();
  });

  it('serves on prem getting started experience when locations are not available', () => {
    const { getByText } = render(<GettingStartedPage />, {
      state: {
        serviceLocations: {
          locations: [],
          locationsLoaded: true,
          loading: false,
        },
      },
    });

    // page is loaded
    expect(getByText('Create your first private location')).toBeInTheDocument();
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../utils/testing/rtl_helpers';
import { MonitorAddPage } from './monitor_add_page';

jest.mock('@kbn/kibana-react-plugin/public', () => {
  const original = jest.requireActual('@kbn/kibana-react-plugin/public');
  return {
    ...original,
    // Mocking CodeEditor, which uses React Monaco under the hood
    CodeEditor: (props: any) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockCodeEditor'}
        data-currentvalue={props.value}
        onChange={(e: any) => {
          props.onChange(e.jsonContent);
        }}
      />
    ),
  };
});

describe('MonitorAddPage', () => {
  it('renders correctly', async () => {
    const { getByText } = render(<MonitorAddPage />, {
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
    expect(getByText('Add a script')).toBeInTheDocument();
  });

  it('renders when loading', async () => {
    const { getByLabelText } = render(<MonitorAddPage />, {
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
          locationsLoaded: false,
          loading: true,
        },
      },
    });

    // page is loading
    expect(getByLabelText(/Loading/)).toBeInTheDocument();
  });

  it('renders an error', async () => {
    const { getByText } = render(<MonitorAddPage />, {
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
          loading: true,
          error: {
            name: 'an error occurred',
          },
        },
      },
    });

    // error
    expect(getByText('Unable to load testing locations')).toBeInTheDocument();
  });
});

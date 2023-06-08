/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mockGlobals } from '../../utils/testing';
import { render } from '../../utils/testing/rtl_helpers';
import { MonitorEditPage } from './monitor_edit_page';
import { ConfigKey } from '../../../../../common/runtime_types';

import * as observabilitySharedPublic from '@kbn/observability-shared-plugin/public';
import {
  PROFILE_VALUES_ENUM,
  PROFILES_MAP,
} from '../../../../../common/constants/monitor_defaults';

mockGlobals();

jest.mock('@kbn/observability-shared-plugin/public');

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

describe('MonitorEditPage', () => {
  const { FETCH_STATUS } = observabilitySharedPublic;

  it('renders correctly', async () => {
    jest.spyOn(observabilitySharedPublic, 'useFetcher').mockReturnValue({
      status: FETCH_STATUS.SUCCESS,
      data: {
        attributes: {
          [ConfigKey.MONITOR_SOURCE_TYPE]: 'ui',
          [ConfigKey.FORM_MONITOR_TYPE]: 'multistep',
          [ConfigKey.LOCATIONS]: [],
          [ConfigKey.THROTTLING_CONFIG]: PROFILES_MAP[PROFILE_VALUES_ENUM.DEFAULT],
        },
      },
      refetch: () => null,
      loading: false,
    });

    const { getByText } = render(<MonitorEditPage />, {
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
    expect(getByText('Monitor script')).toBeInTheDocument();
  });

  it('renders when loading locations', async () => {
    const { getByLabelText } = render(<MonitorEditPage />, {
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

  it('renders when monitor is loading', async () => {
    jest.spyOn(observabilitySharedPublic, 'useFetcher').mockReturnValue({
      status: FETCH_STATUS.SUCCESS,
      data: null,
      refetch: () => null,
      loading: true,
    });

    const { getByLabelText } = render(<MonitorEditPage />, {
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

    // page is loading
    expect(getByLabelText(/Loading/)).toBeInTheDocument();
  });

  it('renders a location error', async () => {
    const { getByText } = render(<MonitorEditPage />, {
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
          error: {
            name: 'an error occurred',
          },
        },
      },
    });

    // error
    expect(getByText('Unable to load testing locations')).toBeInTheDocument();
  });

  it('renders a monitor loading error', async () => {
    jest.spyOn(observabilitySharedPublic, 'useFetcher').mockReturnValue({
      status: FETCH_STATUS.SUCCESS,
      data: null,
      refetch: () => null,
      loading: false,
      error: new Error('test error'),
    });
    const { getByText } = render(<MonitorEditPage />, {
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

    // error
    expect(getByText('Unable to load monitor configuration')).toBeInTheDocument();
  });
});

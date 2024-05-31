/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../utils/testing/rtl_helpers';
import { MonitorEditPage } from './monitor_edit_page';
import { useMonitorName } from '../../hooks/use_monitor_name';
import { ConfigKey } from '../../../../../common/runtime_types';

import * as observabilitySharedPublic from '@kbn/observability-shared-plugin/public';
import {
  PROFILE_VALUES_ENUM,
  PROFILES_MAP,
} from '../../../../../common/constants/monitor_defaults';

jest.mock('@kbn/observability-shared-plugin/public');

jest.mock('../../hooks/use_monitor_name', () => ({
  ...jest.requireActual('../../hooks/use_monitor_name'),
  useMonitorName: jest.fn().mockReturnValue({ nameAlreadyExists: false }),
}));

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

  it.each([true, false])(
    'shows duplicate error when "nameAlreadyExists" is %s',
    async (nameAlreadyExists) => {
      (useMonitorName as jest.Mock).mockReturnValue({ nameAlreadyExists });

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
      const { getByText, queryByText, getByTestId } = render(<MonitorEditPage />, {
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

      const inputField = getByTestId('syntheticsMonitorConfigName');
      fireEvent.focus(inputField);
      userEvent.type(inputField, 'any value'); // Hook is made to return duplicate error as true
      fireEvent.blur(inputField);

      if (nameAlreadyExists) {
        await waitFor(() => getByText('Monitor name already exists'));
      } else {
        expect(queryByText('Monitor name already exists')).not.toBeInTheDocument();
      }
    }
  );
});

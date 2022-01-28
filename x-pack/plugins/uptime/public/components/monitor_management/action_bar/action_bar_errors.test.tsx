/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../../lib/helper/rtl_helpers';
import { FETCH_STATUS } from '../../../../../observability/public';
import {
  DataStream,
  HTTPFields,
  ScheduleUnit,
  SyntheticsMonitor,
} from '../../../../common/runtime_types';
import { spyOnUseFetcher } from '../../../lib/helper/spy_use_fetcher';
import * as kibana from '../../../../../../../src/plugins/kibana_react/public';
import { ActionBar } from './action_bar';
import { mockLocationsState } from '../mocks';

jest.mock('../../../../../../../src/plugins/kibana_react/public', () => ({
  ...jest.requireActual('../../../../../../../src/plugins/kibana_react/public'),
  useKibana: jest.fn(),
}));

const monitor: SyntheticsMonitor = {
  name: 'test-monitor',
  schedule: {
    unit: ScheduleUnit.MINUTES,
    number: '2',
  },
  urls: 'https://elastic.co',
  type: DataStream.HTTP,
} as unknown as HTTPFields;

describe('<ActionBar /> Service Errors', () => {
  let useFetcher: jest.SpyInstance;
  const toast = jest.fn();

  beforeEach(() => {
    useFetcher?.mockClear();
    useFetcher = spyOnUseFetcher({});
  });

  it('Handles service errors', async () => {
    jest.spyOn(kibana, 'useKibana').mockReturnValue({
      notifications: {
        toasts: {
          danger: toast,
        },
      },
    } as unknown as ReturnType<typeof kibana.useKibana>);
    useFetcher.mockReturnValue({
      data: [
        { locationId: 'us_central', error: { reason: 'Invalid config', status: 400 } },
        { locationId: 'us_central', error: { reason: 'Cannot schedule', status: 500 } },
      ],
      status: FETCH_STATUS.SUCCESS,
      refetch: () => {},
    });
    render(<ActionBar monitor={monitor} isValid={true} />, { state: mockLocationsState });
    userEvent.click(screen.getByText('Save monitor'));

    await waitFor(() => {
      expect(toast).toBeCalledTimes(2);
      expect(toast).toBeCalledWith({
        body: (
          <p>
            {'Status: 400. '}
            {'Reason: Invalid config.'}
          </p>
        ),
        title: (
          <p data-test-subj="uptimeAddMonitorFailure">
            There was a problem saving your monitor configuration for location US Central. Please
            try again, or contact Support.
          </p>
        ),
        toastLifeTimeMs: 3000,
      });
      expect(toast).toBeCalledWith({
        body: (
          <p>
            {'Status: 500. '}
            {'Reason: Cannot schedule.'}
          </p>
        ),
        title: (
          <p data-test-subj="uptimeAddMonitorFailure">
            There was a problem saving your monitor configuration for location US Central. Please
            try again, or contact Support.
          </p>
        ),
        toastLifeTimeMs: 3000,
      });
    });
  });
});

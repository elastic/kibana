/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { render, waitFor } from '@testing-library/react';
import { DatePickerContextProvider, type DatePickerDependencies } from '@kbn/ml-date-picker';
import { NotificationsList } from './notifications_list';
import { useMlKibana } from '../../contexts/kibana';

jest.mock('../../contexts/kibana');
jest.mock('../../services/toast_notification_service');
jest.mock('../../contexts/ml/ml_notifications_context');
jest.mock('../../contexts/kibana/use_field_formatter');
jest.mock('../../components/saved_objects_warning');

const getMockedTimefilter = () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { of } = require('rxjs');
  return {
    timefilter: {
      disableTimeRangeSelector: jest.fn(),
      disableAutoRefreshSelector: jest.fn(),
      enableTimeRangeSelector: jest.fn(),
      enableAutoRefreshSelector: jest.fn(),
      getRefreshInterval: jest.fn(),
      setRefreshInterval: jest.fn(),
      getTime: jest.fn(() => {
        return { from: '', to: '' };
      }),
      setTime: jest.fn(),
      isAutoRefreshSelectorEnabled: jest.fn(),
      isTimeRangeSelectorEnabled: jest.fn(),
      getRefreshIntervalUpdate$: jest.fn(),
      getTimeUpdate$: jest.fn(() => {
        return of();
      }),
      getEnabledUpdated$: jest.fn(),
    },
    history: { get: jest.fn() },
  };
};

const getMockedDatePickeDependencies = () => {
  return {
    data: {
      query: {
        timefilter: getMockedTimefilter(),
      },
    },
    notifications: {},
  } as unknown as DatePickerDependencies;
};

const Wrapper: FC = ({ children }) => (
  <I18nProvider>
    <DatePickerContextProvider {...getMockedDatePickeDependencies()}>
      {children}
    </DatePickerContextProvider>
  </I18nProvider>
);

describe('NotificationsList', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  test('starts fetching notification on mount with default params', async () => {
    const {} = render(<NotificationsList />, { wrapper: Wrapper });

    jest.advanceTimersByTime(500);

    await waitFor(() => {
      expect(
        useMlKibana().services.mlServices.mlApiServices.notifications.findMessages
      ).toHaveBeenCalledTimes(1);
      expect(
        useMlKibana().services.mlServices.mlApiServices.notifications.findMessages
      ).toHaveBeenCalledWith({
        earliest: '',
        latest: '',
        queryString: '*',
        sortDirection: 'desc',
        sortField: 'timestamp',
      });
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import { render } from '@testing-library/react';
import React from 'react';

import { EuiSuperDatePicker } from '@elastic/eui';

import { useUrlState } from '../../../util/url_state';
import { mlTimefilterRefresh$ } from '../../../services/timefilter_refresh_service';
import { useToastNotificationService } from '../../../services/toast_notification_service';

import { DatePickerWrapper } from './date_picker_wrapper';

jest.mock('@elastic/eui', () => {
  const EuiSuperDatePickerMock = jest.fn(() => {
    return null;
  });
  const EuiFlexGroupMock = jest.fn(({ children }) => {
    return <>{children}</>;
  });
  const EuiFlexItemMock = jest.fn(({ children }) => {
    return <>{children}</>;
  });
  return {
    EuiSuperDatePicker: EuiSuperDatePickerMock,
    EuiFlexGroup: EuiFlexGroupMock,
    EuiFlexItem: EuiFlexItemMock,
  };
});

jest.mock('../../../util/url_state', () => {
  return {
    useUrlState: jest.fn(() => {
      return [{ refreshInterval: { value: 0, pause: true } }, jest.fn()];
    }),
  };
});

jest.mock('../../../contexts/kibana/use_timefilter');

jest.mock('../../../services/toast_notification_service');

jest.mock('../../../contexts/kibana', () => ({
  useMlKibana: () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { of } = require('rxjs');
    return {
      services: {
        uiSettings: {
          get: jest.fn().mockReturnValue([
            {
              from: 'now/d',
              to: 'now/d',
              display: 'Today',
            },
            {
              from: 'now/w',
              to: 'now/w',
              display: 'This week',
            },
          ]),
        },
        data: {
          query: {
            timefilter: {
              timefilter: {
                getRefreshInterval: jest.fn(),
                setRefreshInterval: jest.fn(),
                getTime: jest.fn(() => {
                  return { from: '', to: '' };
                }),
                isAutoRefreshSelectorEnabled: jest.fn(() => true),
                isTimeRangeSelectorEnabled: jest.fn(() => true),
                getRefreshIntervalUpdate$: jest.fn(),
                getTimeUpdate$: jest.fn(),
                getEnabledUpdated$: jest.fn(),
              },
              history: { get: jest.fn() },
            },
          },
        },
        mlServices: {
          httpService: {
            getLoadingCount$: of(0),
          },
        },
        theme: {
          theme$: of(),
        },
      },
    };
  },
}));

const MockedEuiSuperDatePicker = EuiSuperDatePicker as jest.MockedFunction<
  typeof EuiSuperDatePicker
>;

describe('Navigation Menu: <DatePickerWrapper />', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    MockedEuiSuperDatePicker.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('Minimal initialization.', () => {
    const refreshListener = jest.fn();
    const refreshSubscription = mlTimefilterRefresh$.subscribe(refreshListener);

    const wrapper = mount(<DatePickerWrapper />);
    expect(wrapper.find(DatePickerWrapper)).toHaveLength(1);
    expect(refreshListener).toBeCalledTimes(0);

    refreshSubscription.unsubscribe();
  });

  test('should not allow disabled pause with 0 refresh interval', () => {
    // arrange
    (useUrlState as jest.Mock).mockReturnValue([{ refreshInterval: { pause: false, value: 0 } }]);

    const displayWarningSpy = jest.fn(() => {});

    (useToastNotificationService as jest.Mock).mockReturnValueOnce({
      displayWarningToast: displayWarningSpy,
    });

    // act
    render(<DatePickerWrapper />);

    // assert
    expect(displayWarningSpy).not.toHaveBeenCalled();
    const calledWith = MockedEuiSuperDatePicker.mock.calls[0][0];
    expect(calledWith.isPaused).toBe(true);
    expect(calledWith.refreshInterval).toBe(5000);
  });

  test('should show a warning when configured interval is too short', () => {
    // arrange
    (useUrlState as jest.Mock).mockReturnValue([{ refreshInterval: { pause: false, value: 10 } }]);

    const displayWarningSpy = jest.fn(() => {});

    (useToastNotificationService as jest.Mock).mockReturnValueOnce({
      displayWarningToast: displayWarningSpy,
    });

    // act
    render(<DatePickerWrapper />);

    // assert
    expect(displayWarningSpy).toHaveBeenCalled();
    const calledWith = MockedEuiSuperDatePicker.mock.calls[0][0];
    expect(calledWith.isPaused).toBe(false);
    expect(calledWith.refreshInterval).toBe(10);
  });
});

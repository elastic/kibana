/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { EuiThemeProvider } from '../../../../../../../src/plugins/kibana_react/common';
import { MockUrlParamsContextProvider } from '../../../context/url_params_context/mock_url_params_context_provider';
import { IUrlParams } from '../../../context/url_params_context/types';
import {
  expectTextsInDocument,
  expectTextsNotInDocument,
} from '../../../utils/testHelpers';
import { getComparisonTypes, getSelectOptions, TimeComparison } from './';
import * as urlHelpers from '../../shared/Links/url_helpers';
import moment from 'moment';
import { TimeRangeComparisonType } from './get_time_range_comparison';

function getWrapper(params?: IUrlParams) {
  return ({ children }: { children?: ReactNode }) => {
    return (
      <MemoryRouter>
        <MockUrlParamsContextProvider params={params}>
          <EuiThemeProvider>{children}</EuiThemeProvider>
        </MockUrlParamsContextProvider>
      </MemoryRouter>
    );
  };
}

describe('TimeComparison', () => {
  beforeAll(() => {
    moment.tz.setDefault('Europe/Amsterdam');
  });
  afterAll(() => moment.tz.setDefault(''));

  describe('getComparisonTypes', () => {
    it('shows week and day before when 15 minutes is selected', () => {
      expect(
        getComparisonTypes({
          start: '2021-06-04T16:17:02.335Z',
          end: '2021-06-04T16:32:02.335Z',
        })
      ).toEqual([
        TimeRangeComparisonType.DayBefore.valueOf(),
        TimeRangeComparisonType.WeekBefore.valueOf(),
      ]);
    });

    it('shows week and day before when Today is selected', () => {
      expect(
        getComparisonTypes({
          start: '2021-06-04T04:00:00.000Z',
          end: '2021-06-05T03:59:59.999Z',
        })
      ).toEqual([
        TimeRangeComparisonType.DayBefore.valueOf(),
        TimeRangeComparisonType.WeekBefore.valueOf(),
      ]);
    });

    it('shows week and day before when 24 hours is selected', () => {
      expect(
        getComparisonTypes({
          start: '2021-06-03T16:31:35.748Z',
          end: '2021-06-04T16:31:35.748Z',
        })
      ).toEqual([
        TimeRangeComparisonType.DayBefore.valueOf(),
        TimeRangeComparisonType.WeekBefore.valueOf(),
      ]);
    });
    it('shows week before when 25 hours is selected', () => {
      expect(
        getComparisonTypes({
          start: '2021-06-02T12:32:00.000Z',
          end: '2021-06-03T13:32:09.079Z',
        })
      ).toEqual([TimeRangeComparisonType.WeekBefore.valueOf()]);
    });

    it('shows week before when 7 days is selected', () => {
      expect(
        getComparisonTypes({
          start: '2021-05-28T16:32:17.520Z',
          end: '2021-06-04T16:32:17.520Z',
        })
      ).toEqual([TimeRangeComparisonType.WeekBefore.valueOf()]);
    });
    it('shows period before when 8 days is selected', () => {
      expect(
        getComparisonTypes({
          start: '2021-05-27T16:32:46.747Z',
          end: '2021-06-04T16:32:46.747Z',
        })
      ).toEqual([TimeRangeComparisonType.PeriodBefore.valueOf()]);
    });
  });

  describe('getSelectOptions', () => {
    it('returns formatted text based on comparison type', () => {
      expect(
        getSelectOptions({
          comparisonTypes: [
            TimeRangeComparisonType.DayBefore,
            TimeRangeComparisonType.WeekBefore,
            TimeRangeComparisonType.PeriodBefore,
          ],
          start: '2021-05-27T16:32:46.747Z',
          end: '2021-06-04T16:32:46.747Z',
        })
      ).toEqual([
        {
          value: TimeRangeComparisonType.DayBefore.valueOf(),
          text: 'Day before',
        },
        {
          value: TimeRangeComparisonType.WeekBefore.valueOf(),
          text: 'Week before',
        },
        {
          value: TimeRangeComparisonType.PeriodBefore.valueOf(),
          text: '19/05 18:32 - 27/05 18:32',
        },
      ]);
    });

    it('formats period before as DD/MM/YY HH:mm when range years are different', () => {
      expect(
        getSelectOptions({
          comparisonTypes: [TimeRangeComparisonType.PeriodBefore],
          start: '2020-05-27T16:32:46.747Z',
          end: '2021-06-04T16:32:46.747Z',
        })
      ).toEqual([
        {
          value: TimeRangeComparisonType.PeriodBefore.valueOf(),
          text: '20/05/19 18:32 - 27/05/20 18:32',
        },
      ]);
    });
  });

  describe('TimeComparison component', () => {
    const spy = jest.spyOn(urlHelpers, 'replace');
    beforeEach(() => {
      jest.resetAllMocks();
    });
    describe('Time range is between 0 - 24 hours', () => {
      it('sets default values', () => {
        const Wrapper = getWrapper({
          exactStart: '2021-06-04T16:17:02.335Z',
          exactEnd: '2021-06-04T16:32:02.335Z',
        });
        render(<TimeComparison />, { wrapper: Wrapper });
        expect(spy).toHaveBeenCalledWith(expect.anything(), {
          query: {
            comparisonEnabled: 'true',
            comparisonType: TimeRangeComparisonType.DayBefore,
          },
        });
      });
      it('selects day before and enables comparison', () => {
        const Wrapper = getWrapper({
          exactStart: '2021-06-04T16:17:02.335Z',
          exactEnd: '2021-06-04T16:32:02.335Z',
          comparisonEnabled: true,
          comparisonType: TimeRangeComparisonType.DayBefore,
        });
        const component = render(<TimeComparison />, { wrapper: Wrapper });
        expectTextsInDocument(component, ['Day before', 'Week before']);
        expect(
          (component.getByTestId('comparisonSelect') as HTMLSelectElement)
            .selectedIndex
        ).toEqual(0);
      });

      it('enables day before option when date difference is equal to 24 hours', () => {
        const Wrapper = getWrapper({
          exactStart: '2021-06-03T16:31:35.748Z',
          exactEnd: '2021-06-04T16:31:35.748Z',
          comparisonEnabled: true,
          comparisonType: TimeRangeComparisonType.DayBefore,
        });
        const component = render(<TimeComparison />, { wrapper: Wrapper });
        expectTextsInDocument(component, ['Day before', 'Week before']);
        expect(
          (component.getByTestId('comparisonSelect') as HTMLSelectElement)
            .selectedIndex
        ).toEqual(0);
      });
    });

    describe('Time range is between 24 hours - 1 week', () => {
      it("doesn't show day before option when date difference is greater than 24 hours", () => {
        const Wrapper = getWrapper({
          exactStart: '2021-06-02T12:32:00.000Z',
          exactEnd: '2021-06-03T13:32:09.079Z',
          comparisonEnabled: true,
          comparisonType: TimeRangeComparisonType.WeekBefore,
        });
        const component = render(<TimeComparison />, {
          wrapper: Wrapper,
        });
        expectTextsNotInDocument(component, ['Day before']);
        expectTextsInDocument(component, ['Week before']);
      });
      it('sets default values', () => {
        const Wrapper = getWrapper({
          exactStart: '2021-06-02T12:32:00.000Z',
          exactEnd: '2021-06-03T13:32:09.079Z',
        });
        render(<TimeComparison />, {
          wrapper: Wrapper,
        });
        expect(spy).toHaveBeenCalledWith(expect.anything(), {
          query: {
            comparisonEnabled: 'true',
            comparisonType: TimeRangeComparisonType.WeekBefore,
          },
        });
      });
      it('selects week before and enables comparison', () => {
        const Wrapper = getWrapper({
          exactStart: '2021-06-02T12:32:00.000Z',
          exactEnd: '2021-06-03T13:32:09.079Z',
          comparisonEnabled: true,
          comparisonType: TimeRangeComparisonType.WeekBefore,
        });
        const component = render(<TimeComparison />, {
          wrapper: Wrapper,
        });
        expectTextsNotInDocument(component, ['Day before']);
        expectTextsInDocument(component, ['Week before']);
        expect(
          (component.getByTestId('comparisonSelect') as HTMLSelectElement)
            .selectedIndex
        ).toEqual(0);
      });
    });

    describe('Time range is greater than 7 days', () => {
      it('Shows absolute times without year when within the same year', () => {
        const Wrapper = getWrapper({
          exactStart: '2021-05-27T16:32:46.747Z',
          exactEnd: '2021-06-04T16:32:46.747Z',
          comparisonEnabled: true,
          comparisonType: TimeRangeComparisonType.PeriodBefore,
        });
        const component = render(<TimeComparison />, {
          wrapper: Wrapper,
        });
        expect(spy).not.toHaveBeenCalled();
        expectTextsInDocument(component, ['19/05 18:32 - 27/05 18:32']);
        expect(
          (component.getByTestId('comparisonSelect') as HTMLSelectElement)
            .selectedIndex
        ).toEqual(0);
      });

      it('Shows absolute times with year when on different year', () => {
        const Wrapper = getWrapper({
          exactStart: '2020-05-27T16:32:46.747Z',
          exactEnd: '2021-06-04T16:32:46.747Z',
          comparisonEnabled: true,
          comparisonType: TimeRangeComparisonType.PeriodBefore,
        });
        const component = render(<TimeComparison />, {
          wrapper: Wrapper,
        });
        expect(spy).not.toHaveBeenCalled();
        expectTextsInDocument(component, ['20/05/19 18:32 - 27/05/20 18:32']);
        expect(
          (component.getByTestId('comparisonSelect') as HTMLSelectElement)
            .selectedIndex
        ).toEqual(0);
      });
    });
  });
});

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
import { TimeComparison } from './';
import * as urlHelpers from '../../shared/Links/url_helpers';
import moment from 'moment';

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
  const spy = jest.spyOn(urlHelpers, 'replace');
  beforeEach(() => {
    jest.resetAllMocks();
  });
  describe('Time range is between 0 - 24 hours', () => {
    it('sets default values', () => {
      const Wrapper = getWrapper({
        start: '2021-01-28T14:45:00.000Z',
        end: '2021-01-28T15:00:00.000Z',
        rangeTo: 'now',
      });
      render(<TimeComparison />, {
        wrapper: Wrapper,
      });
      expect(spy).toHaveBeenCalledWith(expect.anything(), {
        query: {
          comparisonEnabled: 'true',
          comparisonType: 'yesterday',
        },
      });
    });
    it('selects yesterday and enables comparison', () => {
      const Wrapper = getWrapper({
        start: '2021-01-28T14:45:00.000Z',
        end: '2021-01-28T15:00:00.000Z',
        comparisonEnabled: true,
        comparisonType: 'yesterday',
        rangeTo: 'now',
      });
      const component = render(<TimeComparison />, {
        wrapper: Wrapper,
      });
      expectTextsInDocument(component, ['Yesterday', 'A week ago']);
      expect(
        (component.getByTestId('comparisonSelect') as HTMLSelectElement)
          .selectedIndex
      ).toEqual(0);
    });

    it('enables yesterday option when date difference is equal to 24 hours', () => {
      const Wrapper = getWrapper({
        start: '2021-01-28T10:00:00.000Z',
        end: '2021-01-29T10:00:00.000Z',
        comparisonEnabled: true,
        comparisonType: 'yesterday',
        rangeTo: 'now',
      });
      const component = render(<TimeComparison />, {
        wrapper: Wrapper,
      });
      expectTextsInDocument(component, ['Yesterday', 'A week ago']);
      expect(
        (component.getByTestId('comparisonSelect') as HTMLSelectElement)
          .selectedIndex
      ).toEqual(0);
    });

    it('selects previous period when rangeTo is different than now', () => {
      const Wrapper = getWrapper({
        start: '2021-01-28T10:00:00.000Z',
        end: '2021-01-29T10:00:00.000Z',
        comparisonEnabled: true,
        comparisonType: 'previousPeriod',
        rangeTo: 'now-15m',
      });
      const component = render(<TimeComparison />, {
        wrapper: Wrapper,
      });
      expectTextsInDocument(component, ['27/01 11:00 - 28/01 11:00']);
      expect(
        (component.getByTestId('comparisonSelect') as HTMLSelectElement)
          .selectedIndex
      ).toEqual(0);
    });
  });

  describe('Time range is between 24 hours - 1 week', () => {
    it("doesn't show yesterday option when date difference is greater than 24 hours", () => {
      const Wrapper = getWrapper({
        start: '2021-01-28T10:00:00.000Z',
        end: '2021-01-29T11:00:00.000Z',
        comparisonEnabled: true,
        comparisonType: 'week',
        rangeTo: 'now',
      });
      const component = render(<TimeComparison />, {
        wrapper: Wrapper,
      });
      expectTextsNotInDocument(component, ['Yesterday']);
      expectTextsInDocument(component, ['A week ago']);
    });
    it('sets default values', () => {
      const Wrapper = getWrapper({
        start: '2021-01-26T15:00:00.000Z',
        end: '2021-01-28T15:00:00.000Z',
        rangeTo: 'now',
      });
      render(<TimeComparison />, {
        wrapper: Wrapper,
      });
      expect(spy).toHaveBeenCalledWith(expect.anything(), {
        query: {
          comparisonEnabled: 'true',
          comparisonType: 'week',
        },
      });
    });
    it('selects week and enables comparison', () => {
      const Wrapper = getWrapper({
        start: '2021-01-26T15:00:00.000Z',
        end: '2021-01-28T15:00:00.000Z',
        comparisonEnabled: true,
        comparisonType: 'week',
        rangeTo: 'now',
      });
      const component = render(<TimeComparison />, {
        wrapper: Wrapper,
      });
      expectTextsNotInDocument(component, ['Yesterday']);
      expectTextsInDocument(component, ['A week ago']);
      expect(
        (component.getByTestId('comparisonSelect') as HTMLSelectElement)
          .selectedIndex
      ).toEqual(0);
    });

    it('selects previous period when rangeTo is different than now', () => {
      const Wrapper = getWrapper({
        start: '2021-01-26T15:00:00.000Z',
        end: '2021-01-28T15:00:00.000Z',
        comparisonEnabled: true,
        comparisonType: 'previousPeriod',
        rangeTo: '2021-01-28T15:00:00.000Z',
      });
      const component = render(<TimeComparison />, {
        wrapper: Wrapper,
      });
      expectTextsInDocument(component, ['24/01 16:00 - 26/01 16:00']);
      expect(
        (component.getByTestId('comparisonSelect') as HTMLSelectElement)
          .selectedIndex
      ).toEqual(0);
    });
  });

  describe('Time range is greater than 7 days', () => {
    it('Shows absolute times without year when within the same year', () => {
      const Wrapper = getWrapper({
        start: '2021-01-20T15:00:00.000Z',
        end: '2021-01-28T15:00:00.000Z',
        comparisonEnabled: true,
        comparisonType: 'previousPeriod',
        rangeTo: 'now',
      });
      const component = render(<TimeComparison />, {
        wrapper: Wrapper,
      });
      expect(spy).not.toHaveBeenCalled();
      expectTextsInDocument(component, ['12/01 16:00 - 20/01 16:00']);
      expect(
        (component.getByTestId('comparisonSelect') as HTMLSelectElement)
          .selectedIndex
      ).toEqual(0);
    });

    it('Shows absolute times with year when on different year', () => {
      const Wrapper = getWrapper({
        start: '2020-12-20T15:00:00.000Z',
        end: '2021-01-28T15:00:00.000Z',
        comparisonEnabled: true,
        comparisonType: 'previousPeriod',
        rangeTo: 'now',
      });
      const component = render(<TimeComparison />, {
        wrapper: Wrapper,
      });
      expect(spy).not.toHaveBeenCalled();
      expectTextsInDocument(component, ['11/11/20 16:00 - 20/12/20 16:00']);
      expect(
        (component.getByTestId('comparisonSelect') as HTMLSelectElement)
          .selectedIndex
      ).toEqual(0);
    });
  });
});

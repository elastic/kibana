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
import {
  expectTextsInDocument,
  expectTextsNotInDocument,
} from '../../../utils/test_helpers';
import { TimeComparison } from './';
import * as urlHelpers from '../../shared/links/url_helpers';
import moment from 'moment';
import { MockApmPluginContextWrapper } from '../../../context/apm_plugin/mock_apm_plugin_context';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { MockUrlParamsContextProvider } from '../../../context/url_params_context/mock_url_params_context_provider';

function getWrapper({
  rangeFrom,
  rangeTo,
  offset,
  comparisonEnabled,
  environment = ENVIRONMENT_ALL.value,
}: {
  rangeFrom: string;
  rangeTo: string;
  offset?: string;
  comparisonEnabled?: boolean;
  environment?: string;
}) {
  return ({ children }: { children?: ReactNode }) => {
    return (
      <MemoryRouter
        initialEntries={[
          `/services?rangeFrom=${rangeFrom}&rangeTo=${rangeTo}&environment=${environment}`,
        ]}
      >
        <MockUrlParamsContextProvider params={{ offset, comparisonEnabled }}>
          <MockApmPluginContextWrapper>
            <EuiThemeProvider>{children}</EuiThemeProvider>
          </MockApmPluginContextWrapper>
        </MockUrlParamsContextProvider>
      </MemoryRouter>
    );
  };
}

describe('TimeComparison component', () => {
  beforeAll(() => {
    moment.tz.setDefault('Europe/Amsterdam');
  });
  afterAll(() => moment.tz.setDefault(''));

  const spy = jest.spyOn(urlHelpers, 'replace');
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('Time range is between 0 - 25 hours', () => {
    it('sets default values', () => {
      const Wrapper = getWrapper({
        rangeFrom: '2021-06-04T16:17:02.335Z',
        rangeTo: '2021-06-04T16:32:02.335Z',
      });
      render(<TimeComparison />, { wrapper: Wrapper });
      expect(spy).toHaveBeenCalledWith(expect.anything(), {
        query: {
          comparisonEnabled: 'true',
          offset: '1d',
        },
      });
    });

    it('selects day before and enables comparison', () => {
      const Wrapper = getWrapper({
        rangeFrom: '2021-06-04T16:17:02.335Z',
        rangeTo: '2021-06-04T16:32:02.335Z',
        comparisonEnabled: true,
        offset: '1d',
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
        rangeFrom: '2021-06-03T16:31:35.748Z',
        rangeTo: '2021-06-04T16:31:35.748Z',
        comparisonEnabled: true,
        offset: '1d',
      });
      const component = render(<TimeComparison />, { wrapper: Wrapper });
      expectTextsInDocument(component, ['Day before', 'Week before']);
      expect(
        (component.getByTestId('comparisonSelect') as HTMLSelectElement)
          .selectedIndex
      ).toEqual(0);
    });
  });

  describe('Time range is between 25 hours - 8 days', () => {
    it("doesn't show day before option when date difference is greater than 25 hours", () => {
      const Wrapper = getWrapper({
        rangeFrom: '2021-06-02T12:32:00.000Z',
        rangeTo: '2021-06-03T13:32:09.079Z',
        comparisonEnabled: true,
        offset: '1w',
      });
      const component = render(<TimeComparison />, {
        wrapper: Wrapper,
      });
      expectTextsNotInDocument(component, ['Day before']);
      expectTextsInDocument(component, ['Week before']);
    });

    it('sets default values', () => {
      const Wrapper = getWrapper({
        rangeFrom: '2021-06-02T12:32:00.000Z',
        rangeTo: '2021-06-03T13:32:09.079Z',
      });
      render(<TimeComparison />, {
        wrapper: Wrapper,
      });
      expect(spy).toHaveBeenCalledWith(expect.anything(), {
        query: {
          comparisonEnabled: 'true',
          offset: '1w',
        },
      });
    });

    it('selects week before and enables comparison', () => {
      const Wrapper = getWrapper({
        rangeFrom: '2021-06-02T12:32:00.000Z',
        rangeTo: '2021-06-03T13:32:09.079Z',
        comparisonEnabled: true,
        offset: '1w',
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

  describe('Time range is greater than 8 days', () => {
    it('Shows absolute times without year when within the same year', () => {
      const Wrapper = getWrapper({
        rangeFrom: '2021-05-27T16:32:46.747Z',
        rangeTo: '2021-06-04T16:32:46.747Z',
        comparisonEnabled: true,
        offset: '691200000ms',
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
        rangeFrom: '2020-05-27T16:32:46.747Z',
        rangeTo: '2021-06-04T16:32:46.747Z',
        comparisonEnabled: true,
        offset: '32227200000ms',
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

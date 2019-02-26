/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import moment from 'moment-timezone';
import * as React from 'react';

import { KibanaConfigContext, PreferenceFormattedDate } from '.';
import { AppFrameworkAdapter } from '../../lib/lib';
import { mockFrameworks } from '../../mock';

describe('PreferenceFormattedDate', () => {
  describe('rendering', () => {
    const isoDateString = '2019-02-25T22:27:05.000Z';
    const configFormattedDateString = (
      dateString: string,
      config: Partial<AppFrameworkAdapter>
    ): string => moment.tz(dateString, config.dateFormatTz!).format(config.dateFormat);

    test('it renders the UTC ISO8601 date string supplied when no configuration exists', () => {
      const wrapper = mount(
        <KibanaConfigContext.Provider value={{}}>
          <PreferenceFormattedDate value={isoDateString} />
        </KibanaConfigContext.Provider>
      );
      expect(wrapper.text()).toEqual(isoDateString);
    });

    test('it renders the UTC ISO8601 date supplied when the default configuration exists', () => {
      const wrapper = mount(
        <KibanaConfigContext.Provider value={mockFrameworks.default_UTC}>
          <PreferenceFormattedDate value={isoDateString} />
        </KibanaConfigContext.Provider>
      );
      expect(wrapper.text()).toEqual(
        configFormattedDateString(isoDateString, mockFrameworks.default_UTC)
      );
    });

    test('it renders the correct tz when a non-UTC configuration exists', () => {
      const wrapper = mount(
        <KibanaConfigContext.Provider value={mockFrameworks.default_MT}>
          <PreferenceFormattedDate value={isoDateString} />
        </KibanaConfigContext.Provider>
      );
      expect(wrapper.text()).toEqual(
        configFormattedDateString(isoDateString, mockFrameworks.default_MT)
      );
    });
  });
});

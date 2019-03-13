/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import moment from 'moment-timezone';
import * as React from 'react';

import { AppTestingFrameworkAdapter } from '../../lib/adapters/framework/testing_framework_adapter';
import { mockFrameworks } from '../../mock';

import { KibanaConfigContext, PreferenceFormattedDate } from '.';

describe('PreferenceFormattedDate', () => {
  describe('rendering', () => {
    const isoDateString = '2019-02-25T22:27:05.000Z';
    const isoDate = new Date(isoDateString);
    const configFormattedDateString = (
      dateString: string,
      config: Partial<AppTestingFrameworkAdapter>
    ): string =>
      moment
        .tz(
          dateString,
          config.dateFormatTz! === 'Browser' ? config.timezone! : config.dateFormatTz!
        )
        .format(config.dateFormat);

    test('renders correctly against snapshot', () => {
      const wrapper = shallow(<PreferenceFormattedDate value={isoDate} />);
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it renders the UTC ISO8601 date string supplied when no configuration exists', () => {
      const wrapper = mount(
        <KibanaConfigContext.Provider value={{}}>
          <PreferenceFormattedDate value={isoDate} />
        </KibanaConfigContext.Provider>
      );
      expect(wrapper.text()).toEqual(isoDateString);
    });

    test('it renders the UTC ISO8601 date supplied when the default configuration exists', () => {
      const wrapper = mount(
        <KibanaConfigContext.Provider value={mockFrameworks.default_UTC}>
          <PreferenceFormattedDate value={isoDate} />
        </KibanaConfigContext.Provider>
      );
      expect(wrapper.text()).toEqual(
        configFormattedDateString(isoDateString, mockFrameworks.default_UTC)
      );
    });

    test('it renders the correct tz when the default browser configuration exists', () => {
      const wrapper = mount(
        <KibanaConfigContext.Provider value={mockFrameworks.default_browser}>
          <PreferenceFormattedDate value={isoDate} />
        </KibanaConfigContext.Provider>
      );
      expect(wrapper.text()).toEqual(
        configFormattedDateString(isoDateString, mockFrameworks.default_browser)
      );
    });

    test('it renders the correct tz when a non-UTC configuration exists', () => {
      const wrapper = mount(
        <KibanaConfigContext.Provider value={mockFrameworks.default_MT}>
          <PreferenceFormattedDate value={isoDate} />
        </KibanaConfigContext.Provider>
      );
      expect(wrapper.text()).toEqual(
        configFormattedDateString(isoDateString, mockFrameworks.default_MT)
      );
    });
  });
});

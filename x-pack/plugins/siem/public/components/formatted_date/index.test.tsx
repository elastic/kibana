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
import { mockFrameworks, TestProviders } from '../../mock';

import { PreferenceFormattedDate, FormattedDate, getMaybeDate } from '.';
import { getEmptyValue } from '../empty_value';
import { KibanaConfigContext } from '../../lib/adapters/framework/kibana_framework_adapter';

describe('formatted_date', () => {
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

  describe('FormattedDate', () => {
    describe('rendering', () => {
      test('it renders against a numeric epoch', () => {
        const wrapper = mount(
          <KibanaConfigContext.Provider value={mockFrameworks.default_UTC}>
            <FormattedDate fieldName="@timestamp" value={1559079339000} />
          </KibanaConfigContext.Provider>
        );
        expect(wrapper.text()).toEqual('May 28, 2019 @ 21:35:39.000');
      });

      test('it renders against a string epoch', () => {
        const wrapper = mount(
          <KibanaConfigContext.Provider value={mockFrameworks.default_UTC}>
            <FormattedDate fieldName="@timestamp" value={'1559079339000'} />
          </KibanaConfigContext.Provider>
        );
        expect(wrapper.text()).toEqual('May 28, 2019 @ 21:35:39.000');
      });

      test('it renders against a ISO string', () => {
        const wrapper = mount(
          <KibanaConfigContext.Provider value={mockFrameworks.default_UTC}>
            <FormattedDate fieldName="@timestamp" value={'2019-05-28T22:04:49.957Z'} />
          </KibanaConfigContext.Provider>
        );
        expect(wrapper.text()).toEqual('May 28, 2019 @ 22:04:49.957');
      });

      test('it renders against an empty string as an empty string placeholder', () => {
        const wrapper = mount(
          <TestProviders>
            <KibanaConfigContext.Provider value={mockFrameworks.default_UTC}>
              <FormattedDate fieldName="@timestamp" value={''} />
            </KibanaConfigContext.Provider>
          </TestProviders>
        );
        expect(wrapper.text()).toEqual('(Empty String)');
      });

      test('it renders against an null as a EMPTY_VALUE', () => {
        const wrapper = mount(
          <TestProviders>
            <KibanaConfigContext.Provider value={mockFrameworks.default_UTC}>
              <FormattedDate fieldName="@timestamp" value={null} />
            </KibanaConfigContext.Provider>
          </TestProviders>
        );
        expect(wrapper.text()).toEqual(getEmptyValue());
      });

      test('it renders against an undefined as a EMPTY_VALUE', () => {
        const wrapper = mount(
          <TestProviders>
            <KibanaConfigContext.Provider value={mockFrameworks.default_UTC}>
              <FormattedDate fieldName="@timestamp" value={undefined} />
            </KibanaConfigContext.Provider>
          </TestProviders>
        );
        expect(wrapper.text()).toEqual(getEmptyValue());
      });

      test('it renders against an invalid date time as just the string its self', () => {
        const wrapper = mount(
          <TestProviders>
            <KibanaConfigContext.Provider value={mockFrameworks.default_UTC}>
              <FormattedDate fieldName="@timestamp" value={'Rebecca Evan Braden'} />
            </KibanaConfigContext.Provider>
          </TestProviders>
        );
        expect(wrapper.text()).toEqual('Rebecca Evan Braden');
      });
    });
  });

  describe('getMaybeDate', () => {
    test('returns empty string as invalid date', () => {
      expect(getMaybeDate('').isValid()).toBe(false);
    });

    test('returns string with empty spaces as invalid date', () => {
      expect(getMaybeDate('  ').isValid()).toBe(false);
    });

    test('returns string date time as valid date', () => {
      expect(getMaybeDate('2019-05-28T23:05:28.405Z').isValid()).toBe(true);
    });

    test('returns string date time as the date we expect', () => {
      expect(getMaybeDate('2019-05-28T23:05:28.405Z').toISOString()).toBe(
        '2019-05-28T23:05:28.405Z'
      );
    });

    test('returns plain string number as epoch as valid date', () => {
      expect(getMaybeDate('1559084770612').isValid()).toBe(true);
    });

    test('returns plain string number as the date we expect', () => {
      expect(
        getMaybeDate('1559084770612')
          .toDate()
          .toISOString()
      ).toBe('2019-05-28T23:06:10.612Z');
    });

    test('returns plain number as epoch as valid date', () => {
      expect(getMaybeDate(1559084770612).isValid()).toBe(true);
    });

    test('returns plain number as epoch as the date we expect', () => {
      expect(
        getMaybeDate(1559084770612)
          .toDate()
          .toISOString()
      ).toBe('2019-05-28T23:06:10.612Z');
    });

    test('returns a short date time string as an epoch (sadly) so this is ambiguous', () => {
      expect(
        getMaybeDate('20190101')
          .toDate()
          .toISOString()
      ).toBe('1970-01-01T05:36:30.101Z');
    });
  });
});

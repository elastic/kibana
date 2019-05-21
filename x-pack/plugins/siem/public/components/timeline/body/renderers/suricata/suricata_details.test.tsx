/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

import { mockBrowserFields } from '../../../../../containers/source/mock';
import { mockTimelineData } from '../../../../../mock';
import { TestProviders } from '../../../../../mock/test_providers';
import { SuricataDetails } from './suricata_details';

describe('SuricataDetails', () => {
  describe('rendering', () => {
    test('it renders the default SuricataDetails', () => {
      const wrapper = shallow(
        <SuricataDetails data={mockTimelineData[2].ecs} browserFields={mockBrowserFields} />
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it returns text if the data does contain suricata data', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <SuricataDetails data={mockTimelineData[2].ecs} browserFields={mockBrowserFields} />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        '4ETEXPLOITNETGEARWNR2000v5 hidden_lang_avi Stack Overflow (CVE-2016-10174)Source192.168.0.3:53Destination192.168.0.3:6343'
      );
    });

    test('it returns null for text if the data contains no suricata data', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <SuricataDetails data={mockTimelineData[0].ecs} browserFields={mockBrowserFields} />
        </TestProviders>
      );
      expect(wrapper.text()).toBeNull();
    });
  });
});

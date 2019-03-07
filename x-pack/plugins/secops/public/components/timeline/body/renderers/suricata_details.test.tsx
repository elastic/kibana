/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import toJson from 'enzyme-to-json';
import * as React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

import { mockEcsData } from '../../../../mock';
import { TestProviders } from '../../../../mock/test_providers';

import { SuricataDetails } from './suricata_details';

describe('SuricataDetails', () => {
  describe('rendering', () => {
    test('it renders the default SuricataDetails', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <SuricataDetails data={mockEcsData[2]} />
        </TestProviders>
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it returns text if the data does contain suricata data', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <SuricataDetails data={mockEcsData[2]} />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        '4ETEXPLOITNETGEARWNR2000v5 hidden_lang_avi Stack Overflow (CVE-2016-10174)Source192.168.0.3:53Destination192.168.0.3:6343'
      );
    });

    test('it returns null for text if the data contains no suricata data', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <SuricataDetails data={mockEcsData[0]} />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(null);
    });
  });
});

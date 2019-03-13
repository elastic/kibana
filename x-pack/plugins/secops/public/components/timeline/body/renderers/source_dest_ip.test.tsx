/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import toJson from 'enzyme-to-json';
import * as React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';

import { mockBrowserFields } from '../../../../containers/source/mock';
import { mockEcsData, TestProviders } from '../../../../mock';

import { SourceDest } from './source_dest_ip';

describe('SuricataDestIp', () => {
  describe('rendering', () => {
    test('it renders the default SuricataDestIp', () => {
      const wrapper = shallowWithIntl(
        <TestProviders>
          <SourceDest data={mockEcsData[2]} browserFields={mockBrowserFields} />
        </TestProviders>
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import toJson from 'enzyme-to-json';
import * as React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { TestProviders } from 'x-pack/plugins/secops/public/mock/test_providers';

import { mockEcsData } from '../../../../mock';

import { SourceDest } from './source_dest_ip';

describe('SuricataDestIp', () => {
  describe('rendering', () => {
    test('it renders the default SuricataDestIp', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <SourceDest data={mockEcsData[2]} />
        </TestProviders>
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });
});

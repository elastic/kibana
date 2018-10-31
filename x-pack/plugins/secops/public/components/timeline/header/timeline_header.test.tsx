/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import { noop } from 'lodash/fp';
import * as React from 'react';
import { mockDataProviders } from '../data_providers/mock/mock_data_providers';
import { TimelineHeader } from './timeline_header';

describe('Header', () => {
  describe('rendering', () => {
    test('it renders the data providers', () => {
      const wrapper = mount(
        <TimelineHeader
          dataProviders={mockDataProviders}
          onDataProviderRemoved={noop}
          width={1000}
        />
      );

      expect(wrapper.find('[data-test-subj="dataProviders"]').exists()).toEqual(true);
    });
  });
});

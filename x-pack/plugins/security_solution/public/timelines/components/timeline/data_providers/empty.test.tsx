/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';

import { Empty } from './empty';
import { TestProviders } from '../../../../common/mock/test_providers';

describe('Empty', () => {
  describe('rendering', () => {
    test('renders correctly against snapshot', () => {
      const wrapper = shallow(<Empty timelineId="test" browserFields={{}} />);
      expect(wrapper).toMatchSnapshot();
    });

    const dropMessage = ['Drop', 'anything', 'highlighted', 'here'];

    test('it renders the expected message', () => {
      const wrapper = mount(
        <TestProviders>
          <Empty timelineId="test" browserFields={{}} />
        </TestProviders>
      );

      dropMessage.forEach((word) => expect(wrapper.text()).toContain(word));
    });
  });
});

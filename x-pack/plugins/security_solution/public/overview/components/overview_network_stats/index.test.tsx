/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';

import { OverviewNetworkStats } from '.';
import { mockData } from './mock';
import { TestProviders } from '../../../common/mock/test_providers';

describe('Overview Network Stat Data', () => {
  describe('rendering', () => {
    test('it renders the default OverviewNetworkStats', () => {
      const wrapper = shallow(
        <OverviewNetworkStats data={mockData.OverviewNetwork} loading={false} />
      );
      expect(wrapper).toMatchSnapshot();
    });
  });
  describe('loading', () => {
    test('it does NOT show loading indicator when loading is false', () => {
      const wrapper = mount(
        <TestProviders>
          <OverviewNetworkStats data={mockData.OverviewNetwork} loading={false} />
        </TestProviders>
      );

      // click the accordion to expand it
      wrapper.find('button').first().simulate('click');
      wrapper.update();

      expect(
        wrapper
          .find('[data-test-subj="network-stat-auditbeatSocket"]')
          .first()
          .find('[data-test-subj="stat-value-loading-spinner"]')
          .first()
          .exists()
      ).toBe(false);
    });

    test('it shows the loading indicator when loading is true', () => {
      const wrapper = mount(
        <TestProviders>
          <OverviewNetworkStats data={mockData.OverviewNetwork} loading={true} />
        </TestProviders>
      );

      // click the accordion to expand it
      wrapper.find('button').first().simulate('click');
      wrapper.update();

      expect(
        wrapper
          .find('[data-test-subj="network-stat-auditbeatSocket"]')
          .first()
          .find('[data-test-subj="stat-value-loading-spinner"]')
          .first()
          .exists()
      ).toBe(true);
    });
  });
});

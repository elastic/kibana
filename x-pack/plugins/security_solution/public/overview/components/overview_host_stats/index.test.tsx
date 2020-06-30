/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';

import { OverviewHostStats } from '.';
import { mockData } from './mock';
import { TestProviders } from '../../../common/mock/test_providers';

describe('Overview Host Stat Data', () => {
  describe('rendering', () => {
    test('it renders the default OverviewHostStats', () => {
      const wrapper = shallow(<OverviewHostStats data={mockData.OverviewHost} loading={false} />);
      expect(wrapper).toMatchSnapshot();
    });
  });
  describe('loading', () => {
    test('it does NOT show loading indicator when loading is false', () => {
      const wrapper = mount(
        <TestProviders>
          <OverviewHostStats data={mockData.OverviewHost} loading={false} />
        </TestProviders>
      );

      // click the accordion to expand it
      wrapper.find('button').first().simulate('click');
      wrapper.update();

      expect(
        wrapper
          .find('[data-test-subj="host-stat-auditbeatAuditd"]')
          .first()
          .find('[data-test-subj="stat-value-loading-spinner"]')
          .first()
          .exists()
      ).toBe(false);
    });
    test('it shows loading indicator when loading is true', () => {
      const wrapper = mount(
        <TestProviders>
          <OverviewHostStats data={mockData.OverviewHost} loading={true} />
        </TestProviders>
      );

      // click the accordion to expand it
      wrapper.find('button').first().simulate('click');
      wrapper.update();

      expect(
        wrapper
          .find('[data-test-subj="host-stat-auditbeatAuditd"]')
          .first()
          .find('[data-test-subj="stat-value-loading-spinner"]')
          .first()
          .exists()
      ).toBe(true);
    });
  });
});

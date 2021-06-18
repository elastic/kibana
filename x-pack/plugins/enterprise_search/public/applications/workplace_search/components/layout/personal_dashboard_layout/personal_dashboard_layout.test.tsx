/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCallOut } from '@elastic/eui';

import { AccountHeader } from '..';

import { PersonalDashboardLayout } from './personal_dashboard_layout';

describe('PersonalDashboardLayout', () => {
  const children = <p data-test-subj="TestChildren">test</p>;
  const sidebar = <p data-test-subj="TestSidebar">test</p>;

  it('renders', () => {
    const wrapper = shallow(
      <PersonalDashboardLayout sidebar={sidebar}>{children}</PersonalDashboardLayout>
    );

    expect(wrapper.find('[data-test-subj="TestChildren"]')).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="TestSidebar"]')).toHaveLength(1);
    expect(wrapper.find(AccountHeader)).toHaveLength(1);
  });

  it('renders callout when in read-only mode', () => {
    const wrapper = shallow(
      <PersonalDashboardLayout sidebar={sidebar} readOnlyMode>
        {children}
      </PersonalDashboardLayout>
    );

    expect(wrapper.find(EuiCallOut)).toHaveLength(1);
  });
});

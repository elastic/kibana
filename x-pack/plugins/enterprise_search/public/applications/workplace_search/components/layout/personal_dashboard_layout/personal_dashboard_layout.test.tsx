/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../__mocks__/kea_logic';
import { mockUseRouteMatch } from '../../../../__mocks__/react_router';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCallOut } from '@elastic/eui';

import { AccountHeader, AccountSettingsSidebar, PrivateSourcesSidebar } from '..';
import { FlashMessages } from '../../../../shared/flash_messages';
import { SetWorkplaceSearchChrome } from '../../../../shared/kibana_chrome';
import { Loading } from '../../../../shared/loading';

import { PersonalDashboardLayout } from './personal_dashboard_layout';

describe('PersonalDashboardLayout', () => {
  const children = <p data-test-subj="TestChildren">test</p>;

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues({ readOnlyMode: false });
  });

  it('renders', () => {
    const wrapper = shallow(<PersonalDashboardLayout>{children}</PersonalDashboardLayout>);

    expect(wrapper.find('[data-test-subj="TestChildren"]')).toHaveLength(1);
    expect(wrapper.find('.personalDashboardLayout')).toHaveLength(1);
    expect(wrapper.find(AccountHeader)).toHaveLength(1);
    expect(wrapper.find(FlashMessages)).toHaveLength(1);
  });

  describe('renders sidebar content based on the route', () => {
    it('renders the private sources sidebar on the private sources path', () => {
      (mockUseRouteMatch as jest.Mock).mockImplementation((path: string) => path === '/p/sources');
      const wrapper = shallow(<PersonalDashboardLayout>{children}</PersonalDashboardLayout>);

      expect(wrapper.find(PrivateSourcesSidebar)).toHaveLength(1);
    });

    it('renders the account settings sidebar on the account settings path', () => {
      (mockUseRouteMatch as jest.Mock).mockImplementation((path: string) => path === '/p/settings');
      const wrapper = shallow(<PersonalDashboardLayout>{children}</PersonalDashboardLayout>);

      expect(wrapper.find(AccountSettingsSidebar)).toHaveLength(1);
    });

    it('does not render a sidebar if not on a valid personal dashboard path', () => {
      (mockUseRouteMatch as jest.Mock).mockImplementation((path: string) => path === '/test');
      const wrapper = shallow(<PersonalDashboardLayout>{children}</PersonalDashboardLayout>);

      expect(wrapper.find(AccountSettingsSidebar)).toHaveLength(0);
      expect(wrapper.find(PrivateSourcesSidebar)).toHaveLength(0);
    });
  });

  describe('loading state', () => {
    it('renders a loading icon in place of children', () => {
      const wrapper = shallow(
        <PersonalDashboardLayout isLoading>{children}</PersonalDashboardLayout>
      );

      expect(wrapper.find(Loading)).toHaveLength(1);
      expect(wrapper.find('[data-test-subj="TestChildren"]')).toHaveLength(0);
    });

    it('renders children & does not render a loading icon when the page is done loading', () => {
      const wrapper = shallow(
        <PersonalDashboardLayout isLoading={false}>{children}</PersonalDashboardLayout>
      );

      expect(wrapper.find(Loading)).toHaveLength(0);
      expect(wrapper.find('[data-test-subj="TestChildren"]')).toHaveLength(1);
    });
  });

  it('sets WS page chrome (primarily document title)', () => {
    const wrapper = shallow(
      <PersonalDashboardLayout pageChrome={['Sources', 'Add source', 'Gmail']}>
        {children}
      </PersonalDashboardLayout>
    );

    expect(wrapper.find(SetWorkplaceSearchChrome).prop('trail')).toEqual([
      'Sources',
      'Add source',
      'Gmail',
    ]);
  });

  it('renders callout when in read-only mode', () => {
    setMockValues({ readOnlyMode: true });
    const wrapper = shallow(<PersonalDashboardLayout>{children}</PersonalDashboardLayout>);

    expect(wrapper.find(EuiCallOut)).toHaveLength(1);
  });
});

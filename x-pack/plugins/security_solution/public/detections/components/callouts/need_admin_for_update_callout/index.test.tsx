/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';
import { TestProviders } from '../../../../common/mock';
import { NeedAdminForUpdateRulesCallOut } from '.';
import * as userInfo from '../../user_info';

describe('need_admin_for_update_callout', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('renders when signalIndexMappingOutdated is true', () => {
    jest
      .spyOn(userInfo, 'useUserData')
      .mockImplementation(jest.fn().mockReturnValue([{ signalIndexMappingOutdated: true }]));
    const wrapper = mount(
      <TestProviders>
        <NeedAdminForUpdateRulesCallOut />
      </TestProviders>
    );
    expect(wrapper.exists('[data-test-subj="callout-need-admin-for-update-rules"]')).toEqual(true);
  });

  test('Does not render a button as this is always persistent', () => {
    jest
      .spyOn(userInfo, 'useUserData')
      .mockImplementation(jest.fn().mockReturnValue([{ signalIndexMappingOutdated: true }]));
    const wrapper = mount(
      <TestProviders>
        <NeedAdminForUpdateRulesCallOut />
      </TestProviders>
    );
    expect(wrapper.exists('[data-test-subj="callout-dismiss-btn"]')).toEqual(false);
  });

  test('Does NOT render when signalIndexMappingOutdated is false', () => {
    jest
      .spyOn(userInfo, 'useUserData')
      .mockImplementation(jest.fn().mockReturnValue([{ signalIndexMappingOutdated: false }]));
    const wrapper = mount(
      <TestProviders>
        <NeedAdminForUpdateRulesCallOut />
      </TestProviders>
    );
    expect(wrapper.exists('[data-test-subj="callout-need-admin-for-update-rules"]')).toEqual(false);
  });

  test('Does NOT render when signalIndexMappingOutdated is null', () => {
    jest
      .spyOn(userInfo, 'useUserData')
      .mockImplementation(jest.fn().mockReturnValue([{ signalIndexMappingOutdated: null }]));
    const wrapper = mount(
      <TestProviders>
        <NeedAdminForUpdateRulesCallOut />
      </TestProviders>
    );
    expect(wrapper.exists('[data-test-subj="callout-need-admin-for-update-rules"]')).toEqual(false);
  });
});

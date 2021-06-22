/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { useGetUserCasesPermissions } from '../../../common/lib/kibana';
import { TestProviders } from '../../../common/mock';
import { HeaderGlobal } from '.';

jest.mock('../../../common/lib/kibana');

describe('HeaderGlobal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not display the cases tab when the user does not have read permissions', () => {
    (useGetUserCasesPermissions as jest.Mock).mockReturnValue({
      crud: false,
      read: false,
    });

    const wrapper = mount(
      <TestProviders>
        <HeaderGlobal />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj="navigation-case"]`).exists()).toBeFalsy();
  });

  it('displays the cases tab when the user has read permissions', () => {
    (useGetUserCasesPermissions as jest.Mock).mockReturnValue({
      crud: true,
      read: true,
    });

    const wrapper = mount(
      <TestProviders>
        <HeaderGlobal />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj="navigation-case"]`).exists()).toBeTruthy();
  });
});

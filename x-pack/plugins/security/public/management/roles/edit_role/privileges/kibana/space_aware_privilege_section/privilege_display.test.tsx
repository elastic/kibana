/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText } from '@elastic/eui';
import React from 'react';

import { mountWithIntl } from '@kbn/test-jest-helpers';

import { PrivilegeDisplay } from './privilege_display';

describe('PrivilegeDisplay', () => {
  it('renders a simple privilege', () => {
    const wrapper = mountWithIntl(<PrivilegeDisplay privilege={'all'} />);
    expect(wrapper.text().trim()).toEqual('All');
  });

  it('renders a privilege with custom styling', () => {
    const wrapper = mountWithIntl(<PrivilegeDisplay privilege={'all'} color={'danger'} />);
    expect(wrapper.text().trim()).toEqual('All');
    expect(wrapper.find(EuiText).props()).toMatchObject({
      color: 'danger',
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIconTip, EuiText } from '@elastic/eui';
import React from 'react';
import { mountWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';
import { PRIVILEGE_SOURCE } from '../../../../../../../lib/kibana_privilege_calculator';
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

  it('renders a privilege with tooltip, if provided', () => {
    const wrapper = mountWithIntl(
      <PrivilegeDisplay privilege={'all'} tooltipContent={<b>ahh</b>} iconType={'asterisk'} />
    );
    expect(wrapper.text().trim()).toEqual('All');
    expect(wrapper.find(EuiIconTip).props()).toMatchObject({
      type: 'asterisk',
      content: <b>ahh</b>,
    });
  });

  it('renders a superceded privilege', () => {
    const wrapper = shallowWithIntl(
      <PrivilegeDisplay
        privilege={'all'}
        explanation={{
          supersededPrivilege: 'read',
          supersededPrivilegeSource: PRIVILEGE_SOURCE.SPACE_BASE,
          actualPrivilege: 'all',
          actualPrivilegeSource: PRIVILEGE_SOURCE.GLOBAL_BASE,
          isDirectlyAssigned: false,
        }}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });
});

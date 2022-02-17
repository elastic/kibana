/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCallOut, EuiPanel, EuiSwitch } from '@elastic/eui';

import { DocumentPermissionsField } from './document_permissions_field';

describe('DocumentPermissionsField', () => {
  const setValue = jest.fn();

  const props = {
    needsPermissions: true,
    indexPermissionsValue: true,
    setValue,
  };

  it('renders', () => {
    const wrapper = shallow(<DocumentPermissionsField {...props} />);

    expect(wrapper.find(EuiPanel)).toHaveLength(1);
  });

  it('renders doc-level permissions message when not available', () => {
    const wrapper = shallow(<DocumentPermissionsField {...props} needsPermissions={false} />);

    expect(wrapper.find('FormattedMessage')).toHaveLength(1);
  });

  it('renders callout when not synced', () => {
    const wrapper = shallow(<DocumentPermissionsField {...props} indexPermissionsValue={false} />);

    expect(wrapper.find(EuiCallOut)).toHaveLength(1);
  });

  it('calls handler on click', () => {
    const wrapper = shallow(<DocumentPermissionsField {...props} />);
    wrapper.find(EuiSwitch).simulate('change', { target: { checked: true } });

    expect(setValue).toHaveBeenCalledWith(true);
  });
});

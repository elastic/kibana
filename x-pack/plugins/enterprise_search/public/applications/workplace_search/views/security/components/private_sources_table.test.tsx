/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiSwitch } from '@elastic/eui';

import { PrivateSourcesTable } from './private_sources_table';

describe('PrivateSourcesTable', () => {
  beforeEach(() => {
    setMockValues({ hasPlatinumLicense: true, isEnabled: true });
  });

  const props = {
    sourceSection: { isEnabled: true, contentSources: [] },
    updateSource: jest.fn(),
    updateEnabled: jest.fn(),
  };

  it('renders', () => {
    const wrapper = shallow(<PrivateSourcesTable {...props} sourceType="standard" />);

    expect(wrapper.find(EuiSwitch)).toHaveLength(1);
  });

  it('handles switches clicks', () => {
    const wrapper = shallow(
      <PrivateSourcesTable
        {...props}
        sourceSection={{
          isEnabled: false,
          contentSources: [{ id: 'gmail', isEnabled: true, name: 'Gmail' }],
        }}
        sourceType="remote"
      />
    );

    const sectionSwitch = wrapper.find(EuiSwitch).first();
    const sourceSwitch = wrapper.find(EuiSwitch).last();

    const event = { target: { value: true } };
    sectionSwitch.prop('onChange')(event as any);
    sourceSwitch.prop('onChange')(event as any);

    expect(props.updateEnabled).toHaveBeenCalled();
    expect(props.updateSource).toHaveBeenCalled();
  });
});

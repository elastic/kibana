/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiButton, EuiCallOut } from '@elastic/eui';

import { DeleteMappingCallout } from './delete_mapping_callout';

describe('DeleteMappingCallout', () => {
  const handleDeleteMapping = jest.fn();
  it('renders', () => {
    const wrapper = shallow(<DeleteMappingCallout handleDeleteMapping={handleDeleteMapping} />);

    expect(wrapper.find(EuiCallOut)).toHaveLength(1);
    expect(wrapper.find(EuiButton).prop('onClick')).toEqual(handleDeleteMapping);
  });

  it('handles button click', () => {
    const wrapper = shallow(<DeleteMappingCallout handleDeleteMapping={handleDeleteMapping} />);
    wrapper.find(EuiButton).simulate('click');

    expect(handleDeleteMapping).toHaveBeenCalled();
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSelectable } from '@elastic/eui';
import { mount } from 'enzyme';
import React from 'react';

import { UserProfilesSelectable } from './user_profiles_selectable';

const userProfiles = [
  {
    uid: 'u_BOulL4QMPSyV9jg5lQI2JmCkUnokHTazBnet3xVHNv0_0',
    data: {},
    user: {
      username: 'delighted_nightingale',
      email: 'delighted_nightingale@profiles.elastic.co',
      full_name: 'Delighted Nightingale',
    },
  },
  {
    uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
    data: {},
    user: {
      username: 'damaged_raccoon',
      email: 'damaged_raccoon@profiles.elastic.co',
      full_name: 'Damaged Raccoon',
    },
  },
  {
    uid: 'u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0',
    data: {},
    user: {
      username: 'physical_dinosaur',
      email: 'physical_dinosaur@profiles.elastic.co',
      full_name: 'Physical Dinosaur',
    },
  },
  {
    uid: 'u_9xDEQqUqoYCnFnPPLq5mIRHKL8gBTo_NiKgOnd5gGk0_0',
    data: {},
    user: {
      username: 'wet_dingo',
      email: 'wet_dingo@profiles.elastic.co',
      full_name: 'Wet Dingo',
    },
  },
];

describe('UserProfilesSelectable', () => {
  it('should render selected options before default options separated by a group label', () => {
    const [firstOption, secondOption, ...defaultOptions] = userProfiles;
    const wrapper = mount(
      <UserProfilesSelectable
        selectedOptions={[secondOption]}
        defaultOptions={[...defaultOptions, firstOption]}
      />
    );
    expect(wrapper.find(EuiSelectable).prop('options')).toEqual([
      expect.objectContaining({
        key: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
      }),
      expect.objectContaining({
        isGroupLabel: true,
        label: 'Suggested',
      }),
      expect.objectContaining({
        key: 'u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0',
      }),
      expect.objectContaining({
        key: 'u_9xDEQqUqoYCnFnPPLq5mIRHKL8gBTo_NiKgOnd5gGk0_0',
      }),
      expect.objectContaining({
        key: 'u_BOulL4QMPSyV9jg5lQI2JmCkUnokHTazBnet3xVHNv0_0',
      }),
    ]);
  });

  it('should not render selected or default options if options prop has been provided', () => {
    const [firstOption, secondOption, ...defaultOptions] = userProfiles;
    const wrapper = mount(
      <UserProfilesSelectable
        selectedOptions={[firstOption]}
        defaultOptions={defaultOptions}
        options={[secondOption]}
      />
    );
    expect(wrapper.find(EuiSelectable).prop('options')).toEqual([
      expect.objectContaining({
        key: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
      }),
    ]);
  });
});

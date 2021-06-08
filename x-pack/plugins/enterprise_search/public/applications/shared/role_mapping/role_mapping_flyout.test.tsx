/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiFlyout } from '@elastic/eui';

import {
  ROLE_MAPPING_FLYOUT_CREATE_TITLE,
  ROLE_MAPPING_FLYOUT_UPDATE_TITLE,
  ROLE_MAPPING_FLYOUT_CREATE_BUTTON,
  ROLE_MAPPING_FLYOUT_UPDATE_BUTTON,
} from './constants';
import { RoleMappingFlyout } from './role_mapping_flyout';

describe('RoleMappingFlyout', () => {
  const closeRoleMappingFlyout = jest.fn();
  const handleSaveMapping = jest.fn();

  const props = {
    isNew: true,
    disabled: false,
    closeRoleMappingFlyout,
    handleSaveMapping,
  };

  it('renders for new mapping', () => {
    const wrapper = shallow(
      <RoleMappingFlyout {...props}>
        <div />
      </RoleMappingFlyout>
    );

    expect(wrapper.find(EuiFlyout)).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="FlyoutTitle"]').prop('children')).toEqual(
      ROLE_MAPPING_FLYOUT_CREATE_TITLE
    );
    expect(wrapper.find('[data-test-subj="FlyoutButton"]').prop('children')).toEqual(
      ROLE_MAPPING_FLYOUT_CREATE_BUTTON
    );
  });

  it('renders for existing mapping', () => {
    const wrapper = shallow(
      <RoleMappingFlyout {...props} isNew={false}>
        <div />
      </RoleMappingFlyout>
    );

    expect(wrapper.find(EuiFlyout)).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="FlyoutTitle"]').prop('children')).toEqual(
      ROLE_MAPPING_FLYOUT_UPDATE_TITLE
    );
    expect(wrapper.find('[data-test-subj="FlyoutButton"]').prop('children')).toEqual(
      ROLE_MAPPING_FLYOUT_UPDATE_BUTTON
    );
  });
});

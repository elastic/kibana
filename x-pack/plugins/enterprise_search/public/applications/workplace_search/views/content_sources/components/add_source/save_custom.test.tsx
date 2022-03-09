/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiPanel, EuiTitle } from '@elastic/eui';

import { EuiLinkTo } from '../../../../../shared/react_router_helpers';

import { LicenseBadge } from '../../../../components/shared/license_badge';
import { staticCustomSourceData } from '../../source_data';

import { SaveCustom } from './save_custom';

describe('SaveCustom', () => {
  const mockValues = {
    newCustomSource: {
      id: 'id',
      accessToken: 'token',
      name: 'name',
    },
    sourceData: staticCustomSourceData,
    isOrganization: true,
    hasPlatinumLicense: true,
  };

  beforeEach(() => {
    setMockValues(mockValues);
  });

  it('renders', () => {
    const wrapper = shallow(<SaveCustom />);

    expect(wrapper.find(EuiPanel)).toHaveLength(1);
    expect(wrapper.find(EuiTitle)).toHaveLength(4);
    expect(wrapper.find(EuiLinkTo)).toHaveLength(1);
    expect(wrapper.find(LicenseBadge)).toHaveLength(0);
  });
  it('renders platinum license badge if license is not present', () => {
    setMockValues({ ...mockValues, hasPlatinumLicense: false });
    const wrapper = shallow(<SaveCustom />);

    expect(wrapper.find(LicenseBadge)).toHaveLength(1);
    expect(wrapper.find(EuiTitle)).toHaveLength(4);
    expect(wrapper.find(EuiLinkTo)).toHaveLength(1);
  });
});

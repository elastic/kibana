/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiLink, EuiPanel, EuiTitle } from '@elastic/eui';

import { EuiLinkTo } from '../../../../../shared/react_router_helpers';

import { LicenseBadge } from '../../../../components/shared/license_badge';

import { SaveCustom } from './save_custom';

describe('SaveCustom', () => {
  const props = {
    documentationUrl: 'http://string.boolean',
    newCustomSource: {
      accessToken: 'dsgfsd',
      key: 'sdfs',
      name: 'source',
      id: '12e1',
    },
    isOrganization: true,
    header: <h1>Header</h1>,
  };
  it('renders', () => {
    setMockValues({ hasPlatinumLicense: true });
    const wrapper = shallow(<SaveCustom {...props} />);

    expect(wrapper.find(EuiPanel)).toHaveLength(1);
    expect(wrapper.find(EuiTitle)).toHaveLength(5);
    expect(wrapper.find(EuiLinkTo)).toHaveLength(1);
  });

  it('renders platinum LicenseBadge and link', () => {
    setMockValues({ hasPlatinumLicense: false });
    const wrapper = shallow(<SaveCustom {...props} />);

    expect(wrapper.find(LicenseBadge)).toHaveLength(1);
    expect(wrapper.find(EuiLink)).toHaveLength(1);
  });
});

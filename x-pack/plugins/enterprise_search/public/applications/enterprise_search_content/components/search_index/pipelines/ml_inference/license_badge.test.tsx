/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiLink } from '@elastic/eui';

import { LicenseBadge, LicenseBadgeProps } from './license_badge';

const DEFAULT_PROPS: LicenseBadgeProps = {
  licenseType: 'mit',
  modelDetailsPageUrl: 'https://my-model.ai',
};

describe('LicenseBadge', () => {
  it('renders with link if URL is present', () => {
    const wrapper = shallow(
      <LicenseBadge
        licenseType={DEFAULT_PROPS.licenseType}
        modelDetailsPageUrl={DEFAULT_PROPS.modelDetailsPageUrl}
      />
    );
    expect(wrapper.find(EuiLink)).toHaveLength(1);
  });
  it('renders without link if URL is not present', () => {
    const wrapper = shallow(<LicenseBadge licenseType={DEFAULT_PROPS.licenseType} />);
    expect(wrapper.find(EuiLink)).toHaveLength(0);
  });
});

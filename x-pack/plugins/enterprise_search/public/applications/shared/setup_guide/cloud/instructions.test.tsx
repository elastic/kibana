/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiSteps, EuiLink } from '@elastic/eui';

import { mountWithIntl } from '../../../test_helpers';

import { CloudSetupInstructions } from './instructions';

describe('CloudSetupInstructions', () => {
  it('renders', () => {
    const wrapper = shallow(<CloudSetupInstructions productName="App Search" />);
    expect(wrapper.find(EuiSteps)).toHaveLength(1);
  });

  it('renders with a link to the Elastic Cloud deployment', () => {
    const wrapper = mountWithIntl(
      <CloudSetupInstructions
        productName="App Search"
        cloudDeploymentLink="https://cloud.elastic.co/deployments/some-id"
      />
    );
    const cloudDeploymentLink = wrapper.find(EuiLink).first();
    expect(cloudDeploymentLink.prop('href')).toEqual(
      'https://cloud.elastic.co/deployments/some-id/edit'
    );
  });
});

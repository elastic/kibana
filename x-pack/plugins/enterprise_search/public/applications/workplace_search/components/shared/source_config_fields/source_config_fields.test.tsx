/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { ApiKey } from '../api_key';
import { CredentialItem } from '../credential_item';

import { SourceConfigFields } from './';

describe('SourceConfigFields', () => {
  it('renders empty with no items', () => {
    const wrapper = shallow(<SourceConfigFields />);

    expect(wrapper.find(ApiKey)).toHaveLength(0);
    expect(wrapper.find(CredentialItem)).toHaveLength(0);
  });

  it('renders with all items, hiding API Keys', () => {
    const wrapper = shallow(
      <SourceConfigFields
        clientId="123"
        clientSecret="456"
        publicKey="abc"
        consumerKey="def"
        baseUrl="ghi"
      />
    );

    expect(wrapper.find(ApiKey)).toHaveLength(0);
    expect(wrapper.find(CredentialItem)).toHaveLength(3);
  });

  it('shows API keys', () => {
    const wrapper = shallow(
      <SourceConfigFields clientSecret="456" publicKey="abc" consumerKey="def" baseUrl="ghi" />
    );

    expect(wrapper.find(ApiKey)).toHaveLength(2);
  });
});

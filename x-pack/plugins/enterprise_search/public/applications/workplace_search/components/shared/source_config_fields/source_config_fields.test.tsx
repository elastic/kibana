/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { ApiKey } from '../api_key';
import { CredentialItem } from '../credential_item';

import { SourceConfigFields } from './source_config_fields';

describe('SourceConfigFields', () => {
  it('renders empty with no items', () => {
    const wrapper = shallow(<SourceConfigFields />);

    expect(wrapper.find(ApiKey)).toHaveLength(0);
    expect(wrapper.find(CredentialItem)).toHaveLength(0);
  });

  it('renders with all items, hiding API Keys', () => {
    const wrapper = shallow(
      <SourceConfigFields
        isOauth1={false}
        clientId="123"
        clientSecret="456"
        publicKey="abc"
        consumerKey="def"
        baseUrl="ghi"
        externalConnectorUrl="https://url.com"
        externalConnectorApiKey="apiKey"
      />
    );

    expect(wrapper.find(ApiKey)).toHaveLength(0);
    expect(wrapper.find(CredentialItem)).toHaveLength(4);
    expect(wrapper.find('[data-test-subj="external-connector-url-input"]')).toHaveLength(1);
  });

  it('shows API keys', () => {
    const wrapper = shallow(
      <SourceConfigFields
        isOauth1
        clientSecret="456"
        publicKey="abc"
        consumerKey="def"
        baseUrl="ghi"
      />
    );

    expect(wrapper.find(ApiKey)).toHaveLength(2);
  });

  it('handles select all button click', () => {
    const wrapper = shallow(<SourceConfigFields externalConnectorUrl="url" />);
    const simulatedEvent = {
      button: 0,
      target: { getAttribute: () => '_self' },
      currentTarget: { select: jest.fn() },
      preventDefault: jest.fn(),
    };

    const input = wrapper
      .find('[data-test-subj="external-connector-url-input"]')
      .dive()
      .find('input');
    input.simulate('click', simulatedEvent);

    expect(simulatedEvent.currentTarget.select).toHaveBeenCalled();
  });
});

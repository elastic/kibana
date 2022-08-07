/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sourceConfigData } from '../../../__mocks__/content_sources.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { ApiKey } from '../api_key';
import { CredentialItem } from '../credential_item';

import { SourceConfigFields } from './source_config_fields';

describe('SourceConfigFields', () => {
  it('renders with all items, hiding API Keys when auth is false', () => {
    const wrapper = shallow(
      <SourceConfigFields isOauth1={false} sourceConfigData={sourceConfigData} />
    );

    expect(wrapper.find(ApiKey)).toHaveLength(0);
    expect(wrapper.find(CredentialItem)).toHaveLength(4);
    expect(wrapper.find('[data-test-subj="external-connector-url-input"]')).toHaveLength(1);
  });

  it('shows API keys when connector uses oauth', () => {
    const wrapper = shallow(<SourceConfigFields isOauth1 sourceConfigData={sourceConfigData} />);

    expect(wrapper.find(ApiKey)).toHaveLength(2);
  });

  it('shows configurable fields for external connectors', () => {
    const wrapper = shallow(
      <SourceConfigFields
        isOauth1={false}
        sourceConfigData={{
          ...sourceConfigData,
          serviceType: 'external',
          configurableFields: [{ key: 'third_party_url', label: 'Third Party URL' }],
          configuredFields: { third_party_url: 'https://www.elastic.co' },
        }}
      />
    );

    expect(wrapper.find(CredentialItem)).toHaveLength(1);
    expect(wrapper.find(CredentialItem).prop('label')).toEqual('Third Party URL');
    expect(wrapper.find(CredentialItem).prop('value')).toEqual('https://www.elastic.co');
  });

  it('handles select all button click', () => {
    const wrapper = shallow(<SourceConfigFields sourceConfigData={sourceConfigData} />);
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

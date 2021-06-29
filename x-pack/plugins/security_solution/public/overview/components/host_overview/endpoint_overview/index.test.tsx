/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';

import '../../../../common/mock/match_media';
import '../../../../common/mock/react_beautiful_dnd';
import { TestProviders } from '../../../../common/mock';

import { EndpointOverview } from './index';
import { HostPolicyResponseActionStatus } from '../../../../../common/search_strategy/security_solution/hosts';

jest.mock('../../../../common/lib/kibana');

describe('EndpointOverview Component', () => {
  test('it renders with endpoint data', () => {
    const endpointData = {
      endpointPolicy: 'demo',
      policyStatus: HostPolicyResponseActionStatus.success,
      sensorVersion: '7.9.0-SNAPSHOT',
    };
    const wrapper = mount(
      <TestProviders>
        <EndpointOverview data={endpointData} />
      </TestProviders>
    );

    const findData = wrapper.find(
      'dl[data-test-subj="endpoint-overview"] dd.euiDescriptionList__description'
    );
    expect(findData.at(0).text()).toEqual(endpointData.endpointPolicy);
    expect(findData.at(1).text()).toEqual(endpointData.policyStatus);
    expect(findData.at(2).text()).toContain(endpointData.sensorVersion); // contain because drag adds a space
  });
  test('it renders with null data', () => {
    const wrapper = mount(
      <TestProviders>
        <EndpointOverview data={null} />
      </TestProviders>
    );

    const findData = wrapper.find(
      'dl[data-test-subj="endpoint-overview"] dd.euiDescriptionList__description'
    );
    expect(findData.at(0).text()).toEqual('—');
    expect(findData.at(1).text()).toEqual('—');
    expect(findData.at(2).text()).toContain('—'); // contain because drag adds a space
  });
});

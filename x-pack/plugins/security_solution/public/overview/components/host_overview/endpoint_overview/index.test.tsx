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

import { EndpointOverview } from '.';
import type { EndpointFields } from '../../../../../common/search_strategy/security_solution/hosts';
import { EndpointMetadataGenerator } from '../../../../../common/endpoint/data_generators/endpoint_metadata_generator';
import { set } from 'lodash';

jest.mock('../../../../common/lib/kibana');

describe('EndpointOverview Component', () => {
  let endpointData: EndpointFields;
  let wrapper: ReturnType<typeof mount>;
  let findData: ReturnType<typeof wrapper['find']>;
  const render = (data: EndpointFields | null = endpointData) => {
    wrapper = mount(
      <TestProviders>
        <EndpointOverview data={data} />
      </TestProviders>
    );
    findData = wrapper.find(
      'dl[data-test-subj="endpoint-overview"] dd.euiDescriptionList__description'
    );

    return wrapper;
  };

  beforeEach(() => {
    endpointData = {
      pendingActions: {},
      hostInfo: new EndpointMetadataGenerator('seed').generateHostInfo({
        metadata: {
          Endpoint: {
            state: {
              isolation: true,
            },
          },
        },
      }),
    };
  });

  test('it renders with endpoint data', () => {
    render();
    expect(findData.at(0).text()).toEqual(
      endpointData?.hostInfo?.metadata.Endpoint.policy.applied.name
    );
    expect(findData.at(1).text()).toEqual(
      endpointData?.hostInfo?.metadata.Endpoint.policy.applied.status
    );
    expect(findData.at(2).text()).toContain(endpointData?.hostInfo?.metadata.agent.version); // contain because drag adds a space
    expect(findData.at(3).text()).toEqual('HealthyIsolated');
  });

  test('it renders with null data', () => {
    render(null);
    expect(findData.at(0).text()).toEqual('—');
    expect(findData.at(1).text()).toEqual('—');
    expect(findData.at(2).text()).toContain('—'); // contain because drag adds a space
    expect(findData.at(3).text()).toEqual('—');
  });

  test('it shows isolation status', () => {
    set(endpointData.hostInfo ?? {}, 'metadata.Endpoint.state.isolation', true);
    render();
    expect(findData.at(3).text()).toEqual('HealthyIsolated');
  });

  // FIXME: un-skip once pending isolation status are supported again
  test.skip.each([
    ['isolate', 'Isolating'],
    ['unisolate', 'Releasing'],
  ])('it shows pending %s status', (action, expectedLabel) => {
    set(endpointData.hostInfo ?? {}, 'metadata.Endpoint.state.isolation', true);
    endpointData.pendingActions![action] = 1;
    render();
    expect(findData.at(3).text()).toEqual(`Healthy${expectedLabel}`);
  });
});

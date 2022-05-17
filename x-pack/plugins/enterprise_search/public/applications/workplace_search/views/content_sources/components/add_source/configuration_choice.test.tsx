/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { mount } from 'enzyme';

import { EuiButtonTo } from '../../../../../shared/react_router_helpers';

import { staticSourceData } from '../../source_data';

import { ConfigurationChoice } from './configuration_choice';

describe('ConfigurationChoice', () => {
  const props = {
    sourceData: staticSourceData[0],
  };
  const mockValues = {
    isOrganization: true,
    sourceConfigData: {
      categories: [],
    },
  };
  const mockActions = {
    initializeSources: jest.fn(),
    resetSourcesState: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(mockValues);
    setMockActions(mockActions);
  });

  it('renders internal connector if available', () => {
    const wrapper = mount(<ConfigurationChoice {...{ ...props }} />);

    const internalConnectorCard = wrapper.find('[data-test-subj="InternalConnectorCard"]');
    expect(internalConnectorCard).toHaveLength(1);
    expect(internalConnectorCard.find(EuiButtonTo).prop('to')).toEqual('/sources/add/box/');
  });

  it('renders external connector if available', () => {
    const wrapper = mount(
      <ConfigurationChoice
        {...{
          ...props,
          sourceData: {
            ...props.sourceData,
            serviceType: 'share_point',
          },
        }}
      />
    );

    const externalConnectorCard = wrapper.find('[data-test-subj="ExternalConnectorCard"]');
    expect(externalConnectorCard.find(EuiButtonTo).prop('to')).toEqual(
      '/sources/add/share_point/external/connector_registration'
    );
  });

  it('directs user to external connector settings page if external connector is available but already configured', () => {
    setMockValues({ ...mockValues, externalConfigured: true });

    const wrapper = mount(
      <ConfigurationChoice
        {...{
          ...props,
          sourceData: {
            ...props.sourceData,
            serviceType: 'share_point',
          },
        }}
      />
    );

    const externalConnectorCard = wrapper.find('[data-test-subj="ExternalConnectorCard"]');
    expect(externalConnectorCard.find(EuiButtonTo).prop('to')).toEqual(
      '/settings/connectors/external/edit'
    );
  });

  it('renders custom connector if available', () => {
    const wrapper = mount(
      <ConfigurationChoice
        {...{
          ...props,
          sourceData: {
            ...props.sourceData,
            serviceType: 'share_point_server',
          },
        }}
      />
    );

    const customConnectorCard = wrapper.find('[data-test-subj="CustomConnectorCard"]');
    expect(customConnectorCard).toHaveLength(1);
    expect(customConnectorCard.find(EuiButtonTo).prop('to')).toEqual(
      '/sources/add/share_point_server/custom'
    );
  });
});

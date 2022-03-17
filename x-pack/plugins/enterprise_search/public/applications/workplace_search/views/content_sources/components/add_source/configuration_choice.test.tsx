/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockKibanaValues, setMockValues } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { mount } from 'enzyme';

import { EuiButton } from '@elastic/eui';

import { staticSourceData } from '../../source_data';

import { ConfigurationChoice } from './configuration_choice';

describe('ConfigurationChoice', () => {
  const { navigateToUrl } = mockKibanaValues;
  const props = {
    sourceData: staticSourceData[0],
  };
  const mockValues = {
    isOrganization: true,
    sourceConfigData: {
      categories: [],
    },
  };

  beforeEach(() => {
    setMockValues(mockValues);
    jest.clearAllMocks();
  });

  it('renders internal connector if available', () => {
    const wrapper = mount(<ConfigurationChoice {...{ ...props }} />);

    expect(wrapper.find('EuiCard')).toHaveLength(1);
    expect(wrapper.find(EuiButton)).toHaveLength(1);
  });
  it('should navigate to internal connector on internal connector click', () => {
    const wrapper = mount(<ConfigurationChoice {...props} />);
    const button = wrapper.find(EuiButton);
    button.simulate('click');
    expect(navigateToUrl).toHaveBeenCalledWith('/sources/add/box/internal/');
  });
  it('should call prop function when provided on internal connector click', () => {
    const advanceSpy = jest.fn();
    const wrapper = mount(<ConfigurationChoice {...{ ...props, goToInternalStep: advanceSpy }} />);
    const button = wrapper.find(EuiButton);
    button.simulate('click');
    expect(navigateToUrl).not.toHaveBeenCalled();
    expect(advanceSpy).toHaveBeenCalled();
  });

  it('renders external connector if available', () => {
    const wrapper = mount(
      <ConfigurationChoice
        {...{
          ...props,
          sourceData: {
            ...props.sourceData,
            internalConnectorAvailable: false,
            externalConnectorAvailable: true,
          },
        }}
      />
    );

    expect(wrapper.find('EuiCard')).toHaveLength(1);
    expect(wrapper.find(EuiButton)).toHaveLength(1);
  });
  it('should navigate to external connector on external connector click', () => {
    const wrapper = mount(
      <ConfigurationChoice
        {...{
          ...props,
          sourceData: {
            ...props.sourceData,
            internalConnectorAvailable: false,
            externalConnectorAvailable: true,
          },
        }}
      />
    );
    const button = wrapper.find(EuiButton);
    button.simulate('click');
    expect(navigateToUrl).toHaveBeenCalledWith('/sources/add/box/external/');
  });

  it('renders custom connector if available', () => {
    const wrapper = mount(
      <ConfigurationChoice
        {...{
          ...props,
          sourceData: {
            ...props.sourceData,
            internalConnectorAvailable: false,
            externalConnectorAvailable: false,
            customConnectorAvailable: true,
          },
        }}
      />
    );

    expect(wrapper.find('EuiCard')).toHaveLength(1);
    expect(wrapper.find(EuiButton)).toHaveLength(1);
  });
  it('should navigate to custom connector on custom connector click', () => {
    const wrapper = mount(
      <ConfigurationChoice
        {...{
          ...props,
          sourceData: {
            ...props.sourceData,
            internalConnectorAvailable: false,
            externalConnectorAvailable: false,
            customConnectorAvailable: true,
          },
        }}
      />
    );
    const button = wrapper.find(EuiButton);
    button.simulate('click');
    expect(navigateToUrl).toHaveBeenCalledWith('/sources/add/box/custom/');
  });
});

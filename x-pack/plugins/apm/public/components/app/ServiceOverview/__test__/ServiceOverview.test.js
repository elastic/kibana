/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { ServiceOverview } from '../view';
import { STATUS } from '../../../../constants';
import * as apmRestServices from '../../../../services/rest/apm/status_check';
jest.mock('../../../../services/rest/apm/status_check');

describe('Service Overview -> View', () => {
  let mockAgentStatus;
  let wrapper;
  let instance;

  beforeEach(() => {
    mockAgentStatus = {
      dataFound: true
    };

    apmRestServices.loadAgentStatus = jest.fn(() =>
      Promise.resolve(mockAgentStatus)
    );

    wrapper = shallow(<ServiceOverview serviceList={{ data: [] }} />);
    instance = wrapper.instance();
  });

  it('should render when historical data is found', () => {
    expect(wrapper).toMatchSnapshot();
    const List = wrapper
      .find('ServiceListRequest')
      .props()
      .render({});
    expect(List.props).toMatchSnapshot();
  });

  it('should render when historical data is not found', () => {
    wrapper.setState({ historicalDataFound: false });
    expect(wrapper).toMatchSnapshot();
    const List = wrapper
      .find('ServiceListRequest')
      .props()
      .render({});
    expect(List.props).toMatchSnapshot();
  });

  it('should check for historical data once', () => {});

  describe('checking for historical data', () => {
    it('should set historical data to true if data is found', async () => {
      const props = {
        serviceList: {
          status: STATUS.SUCCESS,
          data: []
        }
      };
      await instance.checkForHistoricalData(props);
      expect(wrapper.state('historicalDataFound')).toEqual(true);
    });

    it('should set historical data state to false if data is NOT found', async () => {
      const props = {
        serviceList: {
          status: STATUS.SUCCESS,
          data: []
        }
      };
      mockAgentStatus.dataFound = false;
      await instance.checkForHistoricalData(props);
      expect(wrapper.state('historicalDataFound')).toEqual(false);
    });
  });
});

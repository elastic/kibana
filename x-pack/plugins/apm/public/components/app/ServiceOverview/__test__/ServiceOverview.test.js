/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { ServiceOverview } from '../view';
import { STATUS } from '../../../../constants';
import * as apmRestServices from '../../../../services/rest/apm';

jest.mock('../../../../services/rest/apm');

describe('Service Overview -> View', () => {
  let wrapper;
  let instance;

  beforeEach(() => {
    wrapper = shallow(<ServiceOverview serviceList={{}} />);
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

  describe('checking for historical data', () => {
    let mockAgentStatus;

    beforeEach(() => {
      mockAgentStatus = {
        dataFound: true
      };
      // eslint-disable-next-line import/namespace
      apmRestServices.loadAgentStatus = jest.fn(() =>
        Promise.resolve(mockAgentStatus)
      );
    });

    it('should happen if service list status is success and data is empty', async () => {
      const props = {
        serviceList: {
          status: STATUS.SUCCESS,
          data: []
        }
      };
      await instance.checkForHistoricalData(props);
      expect(apmRestServices.loadAgentStatus).toHaveBeenCalledTimes(1);
    });

    it('should not happen if sevice list status is not success', async () => {
      const props = {
        serviceList: {
          status: STATUS.FAILURE,
          data: []
        }
      };
      await instance.checkForHistoricalData(props);
      expect(apmRestServices.loadAgentStatus).not.toHaveBeenCalled();
    });

    it('should not happen if service list data is not empty', async () => {
      const props = {
        serviceList: {
          status: STATUS.SUCCESS,
          data: [1, 2, 3]
        }
      };
      await instance.checkForHistoricalData(props);
      expect(apmRestServices.loadAgentStatus).not.toHaveBeenCalled();
    });

    it('should leave historical data state as true if data is found', async () => {
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

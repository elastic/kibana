/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import { History } from 'history';
import React from 'react';
import { RouteComponentProps } from 'react-router';
import { TransactionOverviewView } from '..';

jest.mock(
  'ui/chrome',
  () => ({
    getBasePath: () => `/some/base/path`,
    getInjected: (key: string) => {
      if (key === 'mlEnabled') {
        return true;
      }
      throw new Error(`inexpected key ${key}`);
    },
    getUiSettingsClient: () => {
      return {
        get: (key: string) => {
          switch (key) {
            case 'timepicker:timeDefaults':
              return { from: 'now-15m', to: 'now', mode: 'quick' };
            case 'timepicker:refreshIntervalDefaults':
              return { display: 'Off', pause: false, value: 0 };
            default:
              throw new Error(`Unexpected config key: ${key}`);
          }
        }
      };
    }
  }),
  { virtual: true }
);

const setup = () => {
  const routerProps = {
    location: { search: '' },
    history: {
      push: jest.fn() as History['push'],
      replace: jest.fn() as History['replace']
    }
  } as RouteComponentProps;

  const props = {
    ...routerProps,
    agentName: 'test-agent',
    serviceName: 'test-service',
    serviceTransactionTypes: ['firstType', 'secondType'],
    urlParams: { transactionType: 'test-type', serviceName: 'MyServiceName' }
  };

  const wrapper = shallow(<TransactionOverviewView {...props} />);
  return { props, wrapper };
};

describe('TransactionOverviewView', () => {
  describe('when  no transaction type is given', () => {
    it('should render null', () => {
      const { wrapper } = setup();
      wrapper.setProps({ urlParams: { serviceName: 'MyServiceName' } });
      expect(wrapper).toMatchInlineSnapshot(`""`);
    });

    it('should redirect to first type', () => {
      const { wrapper, props } = setup();
      wrapper.setProps({ urlParams: { serviceName: 'MyServiceName' } });
      expect(props.history.replace).toHaveBeenCalledWith({
        pathname: '/MyServiceName/transactions/firstType',
        search: ''
      });
    });
  });

  it('should render with type filter controls', () => {
    const { wrapper } = setup();
    expect(wrapper).toMatchSnapshot();
  });

  it('should render without type filter controls if there is just a single type', () => {
    const { wrapper } = setup();
    wrapper.setProps({
      serviceTransactionTypes: ['singleType']
    });
    expect(wrapper.find('EuiFormRow').exists()).toBe(false);
    expect(wrapper).toMatchSnapshot();
  });
});

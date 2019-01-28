/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { TransactionOverviewView } from '..';

jest.mock(
  'ui/chrome',
  () => ({
    getBasePath: () => `/some/base/path`,
    getInjected: key => {
      if (key === 'mlEnabled') {
        return true;
      }
      throw new Error(`inexpected key ${key}`);
    },
    getUiSettingsClient: () => {
      return {
        get: key => {
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
  const props = {
    agentName: 'test-agent',
    serviceName: 'test-service',
    serviceTransactionTypes: ['a', 'b'],
    location: {},
    history: {
      push: jest.fn()
    },
    urlParams: { transactionType: 'test-type', serviceName: 'MyServiceName' }
  };

  const wrapper = shallow(<TransactionOverviewView {...props} />);
  return { props, wrapper };
};

describe('TransactionOverviewView', () => {
  it('should render null if there is no transaction type in the search string', () => {
    const { wrapper } = setup();
    wrapper.setProps({ urlParams: { serviceName: 'MyServiceName' } });
    expect(wrapper).toMatchInlineSnapshot(`""`);
  });

  it('should render with type filter controls', () => {
    const { wrapper } = setup();
    expect(wrapper).toMatchSnapshot();
  });

  it('should render without type filter controls if there is just a single type', () => {
    const { wrapper } = setup();
    wrapper.setProps({
      serviceTransactionTypes: ['a']
    });
    expect(wrapper).toMatchSnapshot();
  });
});

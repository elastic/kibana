/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock(
  'ui/chrome',
  () => ({
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

import React from 'react';
import { shallow } from 'enzyme';
import TransactionOverview from '../view';
import { toJson } from '../../../../utils/testHelpers';
jest.mock('../../../../utils/timepicker', () => {});

const setup = () => {
  const props = {
    urlParams: { transactionType: 'request', serviceName: 'MyServiceName' }
  };

  const wrapper = shallow(<TransactionOverview {...props} />);
  return { props, wrapper };
};

describe('TransactionOverview', () => {
  it('should not call loadTransactionList without any props', () => {
    const { wrapper } = setup();
    expect(toJson(wrapper)).toMatchSnapshot();
  });
});

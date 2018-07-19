/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import TransactionOverview from '../view';
import { toJson } from '../../../../utils/testHelpers';

const setup = () => {
  const props = {
    license: {
      data: {
        features: {
          ml: { isAvailable: true }
        }
      }
    },
    hasDynamicBaseline: false,
    location: {},
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

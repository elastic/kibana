/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { TransactionOverview } from '../view';
import { getKey } from '../../../../store/apiHelpers';
jest.mock('../../../../utils/timepicker', () => {});

const setup = () => {
  const props = {
    service: {
      data: {}
    },
    transactionList: {
      data: []
    },
    urlParams: {},
    loadTransactionList: jest.fn()
  };

  const wrapper = shallow(<TransactionOverview {...props} />);
  return { props, wrapper };
};

describe('TransactionOverview', () => {
  it('should not call loadTransactionList without any props', () => {
    const { props } = setup();
    expect(props.loadTransactionList).not.toHaveBeenCalled();
  });

  it('should call loadTransactionList when props are given, and list is not loading', () => {
    const { props, wrapper } = setup();

    wrapper.setProps({
      urlParams: {
        serviceName: 'myServiceName',
        start: 'myStart',
        end: 'myEnd',
        transactionType: 'myTransactionType'
      },
      transactionList: {
        data: [],
        status: undefined
      }
    });

    expect(props.loadTransactionList).toHaveBeenCalledWith({
      serviceName: 'myServiceName',
      end: 'myEnd',
      start: 'myStart',
      transactionType: 'myTransactionType'
    });
  });

  it('should not call loadTransactionList, if list is already loading', () => {
    const { props, wrapper } = setup();
    wrapper.setProps({
      urlParams: {
        serviceName: 'myServiceName',
        start: 'myStart',
        end: 'myEnd',
        transactionType: 'myTransactionType'
      },
      transactionList: {
        key: getKey({
          serviceName: 'myServiceName',
          start: 'myStart',
          end: 'myEnd',
          transactionType: 'myTransactionType'
        }),
        data: [],
        status: 'LOADING'
      }
    });

    expect(props.loadTransactionList).not.toHaveBeenCalled();
  });
});

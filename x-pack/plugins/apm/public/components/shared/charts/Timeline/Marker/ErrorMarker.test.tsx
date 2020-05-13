/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { ErrorMarker } from './ErrorMarker';
import { ErrorMark } from '../../../../app/TransactionDetails/WaterfallWithSummmary/WaterfallContainer/Marks/get_error_marks';

describe('ErrorMarker', () => {
  it('renders link with trace and transaction', () => {
    const mark = {
      id: 'agent',
      offset: 10000,
      type: 'errorMark',
      verticalLine: true,
      error: {
        trace: { id: '123' },
        transaction: { id: '456' },
        error: { grouping_key: '123' },
        service: { name: 'bar' }
      },
      serviceColor: '#fff'
    } as ErrorMark;
    const component = shallow(<ErrorMarker mark={mark} />);
    expect(component).toMatchSnapshot();
  });
  it('renders link with trace', () => {
    const mark = {
      id: 'agent',
      offset: 10000,
      type: 'errorMark',
      verticalLine: true,
      error: {
        trace: { id: '123' },
        error: { grouping_key: '123' },
        service: { name: 'bar' }
      },
      serviceColor: '#fff'
    } as ErrorMark;
    const component = shallow(<ErrorMarker mark={mark} />);
    expect(component).toMatchSnapshot();
  });
  it('renders link with transaction', () => {
    const mark = {
      id: 'agent',
      offset: 10000,
      type: 'errorMark',
      verticalLine: true,
      error: {
        transaction: { id: '456' },
        error: { grouping_key: '123' },
        service: { name: 'bar' }
      },
      serviceColor: '#fff'
    } as ErrorMark;
    const component = shallow(<ErrorMarker mark={mark} />);
    expect(component).toMatchSnapshot();
  });
  it('renders link without trance and transaction', () => {
    const mark = {
      id: 'agent',
      offset: 10000,
      type: 'errorMark',
      verticalLine: true,
      error: {
        error: { grouping_key: '123' },
        service: { name: 'bar' }
      },
      serviceColor: '#fff'
    } as ErrorMark;
    const component = shallow(<ErrorMarker mark={mark} />);
    expect(component).toMatchSnapshot();
  });
});

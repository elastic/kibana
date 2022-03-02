/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { Marker } from './';
import { AgentMark } from '../../../../app/transaction_details/waterfall_with_summary/waterfall_container/marks/get_agent_marks';
import { ErrorMark } from '../../../../app/transaction_details/waterfall_with_summary/waterfall_container/marks/get_error_marks';

describe('Marker', () => {
  it('renders agent marker', () => {
    const mark = {
      id: 'agent',
      offset: 1000,
      type: 'agentMark',
      verticalLine: true,
    } as AgentMark;
    const component = shallow(<Marker mark={mark} x={10} />);
    expect(component).toMatchSnapshot();
  });

  it('renders error marker', () => {
    const mark = {
      id: 'agent',
      offset: 1000,
      type: 'errorMark',
      verticalLine: true,
      error: {
        trace: { id: '123' },
        transaction: { id: '456' },
        error: { grouping_key: '123' },
        service: { name: 'bar' },
      },
      serviceColor: '#fff',
    } as ErrorMark;
    const component = shallow(<Marker mark={mark} x={10} />);
    expect(component).toMatchSnapshot();
  });
});

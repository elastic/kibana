/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { ServiceList, SERVICE_COLUMNS } from '../index';
import props from './props.json';
import { mockMoment } from '../../../../../utils/testHelpers';

describe('ServiceOverview -> List', () => {
  beforeAll(() => {
    mockMoment();
  });

  it('renders empty state', () => {
    const wrapper = shallow(<ServiceList items={[]} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('renders with data', () => {
    const wrapper = shallow(<ServiceList items={props.items} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('renders columns correctly', () => {
    const service = {
      serviceName: 'opbeans-python',
      agentName: 'python',
      transactionsPerMinute: {
        value: 86.93333333333334,
        timeseries: [],
      },
      errorsPerMinute: {
        value: 12.6,
        timeseries: [],
      },
      avgResponseTime: {
        value: 91535.42944785276,
        timeseries: [],
      },
      environments: ['test'],
    };
    const renderedColumns = SERVICE_COLUMNS.map((c) =>
      c.render(service[c.field], service)
    );

    expect(renderedColumns[0]).toMatchSnapshot();
  });

  describe('without ML data', () => {
    it('does not render health column', () => {
      const wrapper = shallow(
        <ServiceList items={props.items} displayHealthStatus={false} />
      );

      const columns = wrapper.props().columns;

      expect(columns[0].field).not.toBe('severity');
    });
  });

  describe('with ML data', () => {
    it('renders health column', () => {
      const wrapper = shallow(
        <ServiceList items={props.items} displayHealthStatus />
      );

      const columns = wrapper.props().columns;

      expect(columns[0].field).toBe('severity');
    });
  });
});

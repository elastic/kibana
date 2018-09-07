/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { shallow } from 'enzyme';
import React from 'react';

import { ExplorerChartTooltip } from './explorer_chart_tooltip';

describe('ExplorerChartTooltip', () => {
  test('Render tooltip based on infoTooltip data.', () => {
    const infoTooltip = {
      aggregationInterval: '15m',
      chartFunction: 'avg responsetime',
      entityFields: [{
        fieldName: 'airline',
        fieldValue: 'JAL',
      }],
      jobId: 'mock-job-id'
    };

    const wrapper = shallow(<ExplorerChartTooltip {...infoTooltip} />);
    expect(wrapper).toMatchSnapshot();
  });
});

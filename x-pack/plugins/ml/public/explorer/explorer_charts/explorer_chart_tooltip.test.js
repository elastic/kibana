/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import mockConfig from './__mocks__/mock_chart_config_builder_config.json';

import { shallow } from 'enzyme';
import React from 'react';

import { ExplorerChartTooltip } from './explorer_chart_tooltip';

describe('ExplorerChartTooltip', () => {
  test('Render tooltip based on infoTooltip data.', () => {
    const wrapper = shallow(<ExplorerChartTooltip {...mockConfig.infoTooltip} />);
    expect(wrapper).toMatchSnapshot();
  });
});

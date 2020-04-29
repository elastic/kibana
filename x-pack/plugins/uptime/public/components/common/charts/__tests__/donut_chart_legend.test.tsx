/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DonutChartLegend } from '../donut_chart_legend';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';

describe('DonutChartLegend', () => {
  it('applies valid props as expected', () => {
    const wrapper = shallowWithIntl(<DonutChartLegend down={23} up={45} />);
    expect(wrapper).toMatchSnapshot();
  });
});

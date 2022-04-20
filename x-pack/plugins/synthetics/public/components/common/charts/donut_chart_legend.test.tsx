/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithIntl } from '@kbn/test-jest-helpers';

import { DonutChartLegend } from './donut_chart_legend';

import { STATUS_DOWN_LABEL, STATUS_UP_LABEL } from '../translations';

describe('DonutChartLegend', () => {
  it('applies valid props as expected', () => {
    const up = 45;
    const down = 23;
    const component = renderWithIntl(<DonutChartLegend down={down} up={up} />);

    expect(
      component.find('[data-test-subj="xpack.uptime.snapshot.donutChart.up.label"]').text()
    ).toBe(STATUS_UP_LABEL);
    expect(component.find('[data-test-subj="xpack.uptime.snapshot.donutChart.up"]').text()).toBe(
      `${up}`
    );
    expect(
      component.find('[data-test-subj="xpack.uptime.snapshot.donutChart.down.label"]').text()
    ).toBe(STATUS_DOWN_LABEL);
    expect(component.find('[data-test-subj="xpack.uptime.snapshot.donutChart.down"]').text()).toBe(
      `${down}`
    );
  });
});

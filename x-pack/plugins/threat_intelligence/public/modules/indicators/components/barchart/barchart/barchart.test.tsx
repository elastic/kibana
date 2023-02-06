/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import React from 'react';
import { render } from '@testing-library/react';
import { TimeRangeBounds } from '@kbn/data-plugin/common';
import { TestProvidersComponent } from '../../../../../common/mocks/test_providers';
import { IndicatorsBarChart } from '.';
import { ChartSeries } from '../../../services';

moment.suppressDeprecationWarnings = true;
moment.tz.setDefault('UTC');

describe('<IndicatorsBarChart />', () => {
  it('should render barchart', () => {
    const mockIndicators: ChartSeries[] = [
      {
        x: '1 Jan 2022 00:00:00 GMT',
        y: 0,
        g: '[Filebeat] AbuseCH Malware',
      },
      {
        x: '1 Jan 2022 00:00:00 GMT',
        y: 10,
        g: '[Filebeat] AbuseCH MalwareBazaar',
      },
      {
        x: '1 Jan 2022 12:00:00 GMT',
        y: 25,
        g: '[Filebeat] AbuseCH Malware',
      },
      {
        x: '1 Jan 2022 18:00:00 GMT',
        y: 15,
        g: '[Filebeat] AbuseCH MalwareBazaar',
      },
    ];
    const validDate: string = '1 Jan 2022 00:00:00 GMT';
    const mockDateRange: TimeRangeBounds = {
      min: moment(validDate),
      max: moment(validDate).add(1, 'days'),
    };
    const mockField: string = 'threat.indicator.ip';

    const component = render(
      <TestProvidersComponent>
        <IndicatorsBarChart
          indicators={mockIndicators}
          dateRange={mockDateRange}
          field={mockField}
        />
      </TestProvidersComponent>
    );

    expect(component).toMatchSnapshot();
  });
});

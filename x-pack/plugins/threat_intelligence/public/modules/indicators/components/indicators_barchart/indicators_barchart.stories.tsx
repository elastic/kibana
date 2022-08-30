/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React from 'react';
import { Story } from '@storybook/react';
import { TimeRangeBounds } from '@kbn/data-plugin/common';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { CoreStart } from '@kbn/core/public';
import { mockKibanaTimelinesService } from '../../../../common/mocks/mock_kibana_timelines_service';
import { ChartSeries } from '../../hooks/use_aggregated_indicators';
import { IndicatorsBarChart } from './indicators_barchart';

const mockIndicators: ChartSeries[] = [
  {
    x: '1 Jan 2022 00:00:00 GMT',
    y: 2,
    g: '[Filebeat] AbuseCH Malware',
  },
  {
    x: '1 Jan 2022 00:00:00 GMT',
    y: 10,
    g: '[Filebeat] AbuseCH MalwareBazaar',
  },
  {
    x: '1 Jan 2022 06:00:00 GMT',
    y: 0,
    g: '[Filebeat] AbuseCH Malware',
  },
  {
    x: '1 Jan 2022 06:00:00 GMT',
    y: 0,
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

const numberOfDays = 1;

const mockDateRange: TimeRangeBounds = {
  min: moment(validDate),
  max: moment(validDate).add(numberOfDays, 'days'),
};

const mockField: string = 'threat.indicator.ip';

const KibanaReactContext = createKibanaReactContext({
  timelines: mockKibanaTimelinesService,
} as unknown as CoreStart);

export default {
  component: IndicatorsBarChart,
  title: 'IndicatorsBarChart',
};

export const Default: Story<void> = () => (
  <KibanaReactContext.Provider>
    <IndicatorsBarChart indicators={mockIndicators} field={mockField} dateRange={mockDateRange} />
  </KibanaReactContext.Provider>
);

export const NoData: Story<void> = () => (
  <KibanaReactContext.Provider>
    <IndicatorsBarChart indicators={[]} field={''} dateRange={mockDateRange} />
  </KibanaReactContext.Provider>
);

export const CustomHeight: Story<void> = () => {
  const mockHeight = '500px';

  return (
    <KibanaReactContext.Provider>
      <IndicatorsBarChart
        indicators={mockIndicators}
        field={mockField}
        dateRange={mockDateRange}
        height={mockHeight}
      />
    </KibanaReactContext.Provider>
  );
};

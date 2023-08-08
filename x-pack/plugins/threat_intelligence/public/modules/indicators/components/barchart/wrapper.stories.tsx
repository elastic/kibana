/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { of } from 'rxjs';
import { Story } from '@storybook/react';
import { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { TimeRange } from '@kbn/es-query';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { IUiSettingsClient } from '@kbn/core/public';
import { EuiComboBoxOptionOption } from '@elastic/eui';
import { BARCHART_AGGREGATION_NAME } from '../../../../../common/constants';
import { StoryProvidersComponent } from '../../../../mocks/story_providers';
import { mockKibanaTimelinesService } from '../../../../mocks/mock_kibana_timelines_service';
import { IndicatorsBarChartWrapper } from './wrapper';
import { Aggregation, ChartSeries } from '../../services/fetch_aggregated_indicators';

export default {
  component: IndicatorsBarChartWrapper,
  title: 'IndicatorsBarChartWrapper',
};

const mockTimeRange: TimeRange = { from: '', to: '' };

const mockIndexPattern: DataView = {
  fields: [
    {
      name: '@timestamp',
      type: 'date',
    } as DataViewField,
    {
      name: 'threat.feed.name',
      type: 'string',
    } as DataViewField,
  ],
} as DataView;

const validDate: string = '1 Jan 2022 00:00:00 GMT';
const numberOfDays: number = 1;
const aggregation1: Aggregation = {
  events: {
    buckets: [
      {
        doc_count: 0,
        key: 1641016800000,
        key_as_string: '1 Jan 2022 06:00:00 GMT',
      },
      {
        doc_count: 10,
        key: 1641038400000,
        key_as_string: '1 Jan 2022 12:00:00 GMT',
      },
    ],
  },
  doc_count: 0,
  key: '[Filebeat] AbuseCH Malware',
};
const aggregation2: Aggregation = {
  events: {
    buckets: [
      {
        doc_count: 20,
        key: 1641016800000,
        key_as_string: '1 Jan 2022 06:00:00 GMT',
      },
      {
        doc_count: 8,
        key: 1641038400000,
        key_as_string: '1 Jan 2022 12:00:00 GMT',
      },
    ],
  },
  doc_count: 0,
  key: '[Filebeat] AbuseCH MalwareBazaar',
};

const dataServiceMock = {
  search: {
    search: () =>
      of({
        rawResponse: {
          aggregations: {
            [BARCHART_AGGREGATION_NAME]: {
              buckets: [aggregation1, aggregation2],
            },
          },
        },
      }),
  },
  query: {
    timefilter: {
      timefilter: {
        calculateBounds: () => ({
          min: moment(validDate),
          max: moment(validDate).add(numberOfDays, 'days'),
        }),
      },
    },
    filterManager: {
      getFilters: () => {},
      setFilters: () => {},
      getUpdates$: () => of(),
    },
  },
} as unknown as DataPublicPluginStart;

const uiSettingsMock = {
  get: () => {},
} as unknown as IUiSettingsClient;

const timelinesMock = mockKibanaTimelinesService;

const mockField = { label: 'threat.indicator.ip', value: 'ip' };

const mockOnFieldChange = function (value: EuiComboBoxOptionOption<string>): void {
  window.alert(value.label);
};

export const Default: Story<void> = () => {
  return (
    <StoryProvidersComponent
      kibana={{
        data: dataServiceMock,
        uiSettings: uiSettingsMock,
        timelines: timelinesMock,
        settings: { client: uiSettingsMock, globalClient: uiSettingsMock },
      }}
    >
      <IndicatorsBarChartWrapper
        dateRange={{ min: moment(), max: moment() }}
        timeRange={mockTimeRange}
        indexPattern={mockIndexPattern}
        series={[]}
        field={mockField}
        onFieldChange={mockOnFieldChange}
      />
    </StoryProvidersComponent>
  );
};

Default.decorators = [(story) => <MemoryRouter>{story()}</MemoryRouter>];

export const InitialLoad: Story<void> = () => {
  return (
    <StoryProvidersComponent
      kibana={{
        data: dataServiceMock,
        uiSettings: uiSettingsMock,
        timelines: timelinesMock,
        settings: { client: uiSettingsMock, globalClient: uiSettingsMock },
      }}
    >
      <IndicatorsBarChartWrapper
        dateRange={{ min: moment(), max: moment() }}
        timeRange={mockTimeRange}
        indexPattern={mockIndexPattern}
        series={[]}
        isLoading={true}
        isFetching={false}
        field={mockField}
        onFieldChange={mockOnFieldChange}
      />
    </StoryProvidersComponent>
  );
};

InitialLoad.decorators = [(story) => <MemoryRouter>{story()}</MemoryRouter>];

export const UpdatingData: Story<void> = () => {
  const mockIndicators: ChartSeries[] = [
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

  return (
    <StoryProvidersComponent
      kibana={{
        data: dataServiceMock,
        uiSettings: uiSettingsMock,
        settings: { client: uiSettingsMock, globalClient: uiSettingsMock },
        timelines: timelinesMock,
      }}
    >
      <IndicatorsBarChartWrapper
        dateRange={{ min: moment(), max: moment() }}
        timeRange={mockTimeRange}
        indexPattern={mockIndexPattern}
        series={mockIndicators}
        isLoading={false}
        isFetching={true}
        field={mockField}
        onFieldChange={mockOnFieldChange}
      />
    </StoryProvidersComponent>
  );
};

UpdatingData.decorators = [(story) => <MemoryRouter>{story()}</MemoryRouter>];

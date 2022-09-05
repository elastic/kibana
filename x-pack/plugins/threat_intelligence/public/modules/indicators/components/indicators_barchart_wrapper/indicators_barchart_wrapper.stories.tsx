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
import { StoryProvidersComponent } from '../../../../common/mocks/story_providers';
import { mockKibanaTimelinesService } from '../../../../common/mocks/mock_kibana_timelines_service';
import { Aggregation, AGGREGATION_NAME } from '../../hooks/use_aggregated_indicators';
import { DEFAULT_TIME_RANGE } from '../../hooks/use_filters/utils';
import { IndicatorsBarChartWrapper } from './indicators_barchart_wrapper';

export default {
  component: IndicatorsBarChartWrapper,
  title: 'IndicatorsBarChartWrapper',
};

export const Default: Story<void> = () => {
  const mockTimeRange: TimeRange = DEFAULT_TIME_RANGE;

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
              [AGGREGATION_NAME]: {
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

  return (
    <StoryProvidersComponent
      kibana={{ data: dataServiceMock, uiSettings: uiSettingsMock, timelines: timelinesMock }}
    >
      <IndicatorsBarChartWrapper timeRange={mockTimeRange} indexPattern={mockIndexPattern} />
    </StoryProvidersComponent>
  );
};
Default.decorators = [(story) => <MemoryRouter>{story()}</MemoryRouter>];

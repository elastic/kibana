/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../../../../lib/helper/rtl_helpers';
import { WaterfallMarkerTrend } from './waterfall_marker_trend';
import moment from 'moment';
import { JourneyStep } from '../../../../../../common/runtime_types';
import { TestWrapper } from './waterfall_marker_test_helper';

describe('<WaterfallMarkerTrend />', () => {
  const mockDiff = jest.fn();

  jest.spyOn(moment.prototype, 'diff').mockImplementation(mockDiff);

  const timestamp = '2021-12-03T14:35:41.072Z';

  let activeStep: JourneyStep | undefined;
  beforeEach(() => {
    activeStep = {
      '@timestamp': timestamp,
      _id: 'id',
      synthetics: {
        type: 'step/end',
        step: {
          index: 0,
          status: 'succeeded',
          name: 'test-name',
          duration: {
            us: 9999,
          },
        },
      },
      monitor: {
        id: 'mon-id',
        check_group: 'group',
        timespan: {
          gte: '1988-10-09T12:00:00.000Z',
          lt: '1988-10-10T12:00:00.000Z',
        },
      },
    };
    // value diff in milliseconds
    mockDiff.mockReturnValue(10 * 1000);
  });

  const BASE_PATH = 'xyz';

  it('supplies props', () => {
    const { getByLabelText, getByText, getByRole } = render(
      <TestWrapper activeStep={activeStep} basePath={BASE_PATH}>
        <WaterfallMarkerTrend title="test title" field="field" />
      </TestWrapper>,
      {
        core: {
          http: {
            basePath: {
              get: () => BASE_PATH,
            },
          },
        },
      }
    );
    const heading = getByRole('heading');
    expect(heading.innerHTML).toEqual('test title');
    expect(getByLabelText('append title').innerHTML.indexOf(BASE_PATH)).not.toBe(-1);
    expect(getByText('kpi-over-time'));
    const attributesText = getByLabelText('attributes').innerHTML;

    expect(attributesText.includes('"2021-12-03T14:35:41.072Z"')).toBeTruthy();
    const attributes = JSON.parse(attributesText);
    expect(
      moment(attributes[0].time.from)
        .add(10 * 1000 * 48, 'millisecond')
        .toISOString()
    ).toBe(timestamp);
  });

  it('handles timespan difference', () => {
    const oneMinDiff = 60 * 1000;
    mockDiff.mockReturnValue(oneMinDiff);
    const { getByLabelText } = render(
      <TestWrapper activeStep={activeStep} basePath={BASE_PATH}>
        <WaterfallMarkerTrend title="test title" field="field" />
      </TestWrapper>
    );

    const attributesText = getByLabelText('attributes').innerHTML;

    expect(attributesText).toBe(
      JSON.stringify([
        {
          name: 'test title(test-name)',
          selectedMetricField: 'field',
          time: { to: '2021-12-03T14:35:41.072Z', from: '2021-12-03T13:47:41.072Z' },
          seriesType: 'area',
          dataType: 'synthetics',
          reportDefinitions: {
            'monitor.name': [null],
            'synthetics.step.name.keyword': ['test-name'],
          },
          operationType: 'last_value',
        },
      ])
    );

    const attributes = JSON.parse(attributesText);
    expect(
      moment(attributes[0].time.from)
        .add(oneMinDiff * 48, 'millisecond')
        .toISOString()
    ).toBe(timestamp);
  });

  it('returns null for missing active step', () => {
    activeStep = undefined;
    const { container } = render(
      <TestWrapper activeStep={activeStep} basePath={BASE_PATH}>
        <WaterfallMarkerTrend title="test title" field="field" />
      </TestWrapper>
    );
    expect(container.innerHTML).toBe('');
  });
});

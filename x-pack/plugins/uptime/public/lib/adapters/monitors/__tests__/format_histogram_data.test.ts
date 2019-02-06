/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HistogramSeries } from 'x-pack/plugins/uptime/common/graphql/types';
import { formatHistogramData } from '../format_histogram_data';

describe('formatHistogramData', () => {
  it('returns an empty arrays when no data is provided', () => {
    const result = formatHistogramData([]);
    expect(result).toEqual({ downSeriesData: [], upSeriesData: [] });
  });
  it('filters out null data sets', () => {
    const seriesList: HistogramSeries[] = [
      {
        monitorId: 'monitor1',
        data: null,
      },
      {
        monitorId: 'monitor2',
        data: [
          {
            upCount: null,
            downCount: 2,
            x: 10,
            x0: 11,
            y: 4,
          },
          {
            upCount: null,
            downCount: 2,
            x: 11,
            x0: 12,
            y: 4,
          },
          {
            upCount: 4,
            downCount: null,
            x: 12,
            x0: 13,
            y: 4,
          },
        ],
      },
    ];
    const result = formatHistogramData(seriesList);
    expect(result).toMatchSnapshot();
  });

  it('adds to existing up count', () => {
    const seriesList: HistogramSeries[] = [
      {
        monitorId: 'monitor1',
        data: [
          {
            upCount: 3,
            downCount: null,
            x: 10,
            x0: 11,
            y: 4,
          },
          {
            upCount: 3,
            downCount: null,
            x: 11,
            x0: 12,
            y: 4,
          },
          {
            upCount: 3,
            downCount: null,
            x: 12,
            x0: 13,
            y: 4,
          },
        ],
      },
      {
        monitorId: 'monitor2',
        data: [
          {
            upCount: null,
            downCount: 2,
            x: 10,
            x0: 11,
            y: 4,
          },
          {
            upCount: null,
            downCount: 2,
            x: 11,
            x0: 12,
            y: 4,
          },
          {
            upCount: 4,
            downCount: null,
            x: 12,
            x0: 13,
            y: 4,
          },
        ],
      },
    ];
    const result = formatHistogramData(seriesList);
    expect(result).toMatchSnapshot();
  });
  it('adds to existing down count', () => {
    const seriesList: HistogramSeries[] = [
      {
        monitorId: 'monitor1',
        data: [
          {
            upCount: 3,
            downCount: null,
            x: 10,
            x0: 11,
            y: 4,
          },
          {
            upCount: 3,
            downCount: null,
            x: 11,
            x0: 12,
            y: 4,
          },
          {
            upCount: 3,
            downCount: null,
            x: 12,
            x0: 13,
            y: 4,
          },
        ],
      },
      {
        monitorId: 'monitor2',
        data: [
          {
            upCount: null,
            downCount: 2,
            x: 10,
            x0: 11,
            y: 4,
          },
          {
            upCount: null,
            downCount: 2,
            x: 11,
            x0: 12,
            y: 4,
          },
          {
            upCount: 4,
            downCount: null,
            x: 12,
            x0: 13,
            y: 4,
          },
        ],
      },
      {
        monitorId: 'monitor3',
        data: [
          {
            upCount: null,
            downCount: 24,
            x: 10,
            x0: 11,
            y: 4,
          },
          {
            upCount: null,
            downCount: 23,
            x: 11,
            x0: 12,
            y: 4,
          },
          {
            upCount: null,
            downCount: 35,
            x: 12,
            x0: 13,
            y: 4,
          },
        ],
      },
    ];
    const result = formatHistogramData(seriesList);
    expect(result).toMatchSnapshot();
  });

  it(`doesn't add an entry to either count when none exists`, () => {
    const seriesList: HistogramSeries[] = [
      {
        monitorId: 'monitor1',
        data: [
          {
            upCount: 3,
            downCount: null,
            x: 10,
            x0: 11,
            y: 4,
          },
          {
            upCount: 3,
            downCount: null,
            x: 11,
            x0: 12,
            y: 4,
          },
          {
            upCount: 3,
            downCount: null,
            x: 12,
            x0: 13,
            y: 4,
          },
        ],
      },
      {
        monitorId: 'monitor2',
        data: [
          {
            upCount: null,
            downCount: 2,
            x: 10,
            x0: 11,
            y: 4,
          },
          {
            upCount: null,
            downCount: 2,
            x: 11,
            x0: 12,
            y: 4,
          },
          {
            upCount: 4,
            downCount: null,
            x: 12,
            x0: 13,
            y: 4,
          },
        ],
      },
      {
        monitorId: 'monitor3',
        data: [
          {
            upCount: null,
            downCount: 24,
            x: 10,
            x0: 11,
            y: 4,
          },
          {
            upCount: null,
            downCount: null,
            x: 11,
            x0: 12,
            y: 4,
          },
          {
            upCount: null,
            downCount: 35,
            x: 12,
            x0: 13,
            y: 4,
          },
        ],
      },
    ];
    const result = formatHistogramData(seriesList);
    expect(result).toMatchSnapshot();
  });
});

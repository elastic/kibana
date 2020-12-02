/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { colourPalette, getTimings, getSeriesAndDomain, extractItems } from './data_formatting';

const networkEvent = {
  timestamp: '2020-12-06T19:55:01.273Z',
  method: 'GET',
  url: 'https://www.some-fake-url.css',
  status: 200,
  mimeType: 'text/css',
  requestSentTime: 1723033619.631,
  requestStartTime: 1723033621.036,
  loadEndTime: 1723033729.635,
  timings: {
    ssl_start: 32.875,
    proxy_end: -1,
    send_start: 69.738,
    send_end: 69.923,
    connect_start: 0.591,
    receive_headers_end: 106.076,
    dns_end: 0.591,
    connect_end: 69.557,
    worker_fetch_start: -1,
    worker_ready: -1,
    push_start: 0,
    dns_start: 0.539,
    ssl_end: 69.542,
    request_time: 1723033.621036,
    worker_respond_with_settled: -1,
    worker_start: -1,
    push_end: 0,
    proxy_start: -1,
  },
};

describe('getTimings', () => {
  it('Calculates timings for network events correctly', () => {
    const timings = getTimings(
      networkEvent.timings,
      networkEvent.requestSentTime,
      networkEvent.loadEndTime
    );
    expect(timings).toEqual({
      blocked: 1.9439999713897707,
      connect: 32.480000000000004,
      dns: 0.051999999999999935,
      receive: 2.5230000019073486,
      send: 0.18500000000000227,
      ssl: 36.667,
      wait: 36.15299999999999,
    });
  });
});

describe('getSeriesAndDomain', () => {
  let seriesAndDomain: any;
  let NetworkItems: any;

  beforeAll(() => {
    NetworkItems = extractItems([networkEvent]);
    seriesAndDomain = getSeriesAndDomain(NetworkItems);
  });

  it('Correctly calculates the domain', () => {
    expect(seriesAndDomain.domain).toEqual({ max: 110.00399997329711, min: 0 });
  });

  it('Correctly calculates the series', () => {
    expect(seriesAndDomain.series).toEqual([
      {
        config: {
          colour: '#b9a888',
          tooltipProps: { colour: '#b9a888', value: 'Queued / Blocked: 1.944ms' },
        },
        x: 0,
        y: 1.9439999713897707,
        y0: 0,
      },
      {
        config: { colour: '#54b399', tooltipProps: { colour: '#54b399', value: 'DNS: 0.052ms' } },
        x: 0,
        y: 1.9959999713897707,
        y0: 1.9439999713897707,
      },
      {
        config: {
          colour: '#da8b45',
          tooltipProps: { colour: '#da8b45', value: 'Connecting: 32.480ms' },
        },
        x: 0,
        y: 34.475999971389776,
        y0: 1.9959999713897707,
      },
      {
        config: { colour: '#edc5a2', tooltipProps: { colour: '#edc5a2', value: 'SSL: 36.667ms' } },
        x: 0,
        y: 71.14299997138977,
        y0: 34.475999971389776,
      },
      {
        config: {
          colour: '#d36086',
          tooltipProps: { colour: '#d36086', value: 'Sending request: 0.185ms' },
        },
        x: 0,
        y: 71.32799997138977,
        y0: 71.14299997138977,
      },
      {
        config: {
          colour: '#b0c9e0',
          tooltipProps: { colour: '#b0c9e0', value: 'Waiting (TTFB): 36.153ms' },
        },
        x: 0,
        y: 107.48099997138976,
        y0: 71.32799997138977,
      },
      {
        config: {
          colour: '#ca8eae',
          tooltipProps: { colour: '#ca8eae', value: 'Content downloading: 2.523ms' },
        },
        x: 0,
        y: 110.00399997329711,
        y0: 107.48099997138976,
      },
    ]);
  });
});

describe('Palettes', () => {
  it('A colour palette comprising timing and mime type colours is correctly generated', () => {
    expect(colourPalette).toEqual({
      blocked: '#b9a888',
      connect: '#da8b45',
      dns: '#54b399',
      font: '#aa6556',
      html: '#f3b3a6',
      media: '#d6bf57',
      other: '#e7664c',
      receive: '#54b399',
      script: '#9170b8',
      send: '#d36086',
      ssl: '#edc5a2',
      stylesheet: '#ca8eae',
      wait: '#b0c9e0',
    });
  });
});

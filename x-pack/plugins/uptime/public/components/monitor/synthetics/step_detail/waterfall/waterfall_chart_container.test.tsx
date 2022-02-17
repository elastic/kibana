/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { render } from '../../../../../lib/helper/rtl_helpers';
import { WaterfallChartContainer } from './waterfall_chart_container';

const networkEvents = {
  events: [
    {
      timestamp: '2021-01-21T10:31:21.537Z',
      method: 'GET',
      url: 'https://apv-static.minute.ly/videos/v-c2a526c7-450d-428e-1244649-a390-fb639ffead96-s45.746-54.421m.mp4',
      status: 206,
      mimeType: 'video/mp4',
      requestSentTime: 241114127.474,
      loadEndTime: 241116573.402,
      timings: {
        total: 2445.928000001004,
        queueing: 1.7399999778717756,
        blocked: 0.391999987186864,
        receive: 2283.964000031119,
        connect: 91.5709999972023,
        wait: 28.795999998692423,
        proxy: -1,
        dns: 36.952000024029985,
        send: 0.10000000474974513,
        ssl: 64.28900000173599,
      },
    },
    {
      timestamp: '2021-01-21T10:31:22.174Z',
      method: 'GET',
      url: 'https://dpm.demdex.net/ibs:dpid=73426&dpuuid=31597189268188866891125449924942215949',
      status: 200,
      mimeType: 'image/gif',
      requestSentTime: 241114749.202,
      loadEndTime: 241114805.541,
      timings: {
        queueing: 1.2240000069141388,
        receive: 2.218999987235293,
        proxy: -1,
        dns: -1,
        send: 0.14200000441633165,
        blocked: 1.033000007737428,
        total: 56.33900000248104,
        wait: 51.72099999617785,
        ssl: -1,
        connect: -1,
      },
    },
    {
      timestamp: '2021-01-21T10:31:21.679Z',
      method: 'GET',
      url: 'https://dapi.cms.mlbinfra.com/v2/content/en-us/sel-t119-homepage-mediawall',
      status: 200,
      mimeType: 'application/json',
      requestSentTime: 241114268.04299998,
      loadEndTime: 241114665.609,
      timings: {
        total: 397.5659999996424,
        dns: 29.5429999823682,
        wait: 221.6830000106711,
        queueing: 2.1410000044852495,
        connect: 106.95499999565072,
        ssl: 69.06899999012239,
        receive: 2.027999988058582,
        blocked: 0.877000013133511,
        send: 23.719999997410923,
        proxy: -1,
      },
    },
    {
      timestamp: '2021-01-21T10:31:21.740Z',
      method: 'GET',
      url: 'https://platform.twitter.com/embed/embed.runtime.b313577971db9c857801.js',
      status: 200,
      mimeType: 'application/javascript',
      requestSentTime: 241114303.84899998,
      loadEndTime: 241114370.361,
      timings: {
        send: 1.357000001007691,
        wait: 40.12299998430535,
        receive: 16.78500001435168,
        ssl: -1,
        queueing: 2.5670000177342445,
        total: 66.51200001942925,
        connect: -1,
        blocked: 5.680000002030283,
        proxy: -1,
        dns: -1,
      },
    },
    {
      timestamp: '2021-01-21T10:31:21.740Z',
      method: 'GET',
      url: 'https://platform.twitter.com/embed/embed.modules.7a266e7acfd42f2581a5.js',
      status: 200,
      mimeType: 'application/javascript',
      requestSentTime: 241114305.939,
      loadEndTime: 241114938.264,
      timings: {
        wait: 51.61500000394881,
        dns: -1,
        ssl: -1,
        receive: 506.5750000067055,
        proxy: -1,
        connect: -1,
        blocked: 69.51599998865277,
        queueing: 4.453999979887158,
        total: 632.324999984121,
        send: 0.16500000492669642,
      },
    },
  ],
};

const defaultState = {
  networkEvents: {
    test: {
      '1': {
        ...networkEvents,
        total: 100,
        isWaterfallSupported: true,
        loading: false,
      },
    },
  },
};

describe('WaterfallChartContainer', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  it('does not display waterfall chart unavailable when isWaterfallSupported is true', () => {
    render(<WaterfallChartContainer checkGroup="test" stepIndex={1} />, {
      state: defaultState,
    });
    expect(screen.queryByText('Waterfall chart unavailable')).not.toBeInTheDocument();
  });

  it('displays waterfall chart unavailable when isWaterfallSupported is false', () => {
    const state = {
      networkEvents: {
        test: {
          '1': {
            ...networkEvents,
            total: 100,
            isWaterfallSupported: false,
            loading: false,
          },
        },
      },
    };
    render(<WaterfallChartContainer checkGroup="test" stepIndex={1} />, {
      state,
    });
    expect(screen.getByText('Waterfall chart unavailable')).toBeInTheDocument();
  });

  it('displays loading bar when loading', () => {
    const state = {
      networkEvents: {
        test: {
          '1': {
            ...networkEvents,
            total: 100,
            isWaterfallSupported: false,
            loading: true,
          },
        },
      },
    };
    render(<WaterfallChartContainer checkGroup="test" stepIndex={1} />, {
      state,
    });
    expect(screen.getByLabelText('Waterfall chart loading')).toBeInTheDocument();
  });

  it('displays no data available message when no events are available', () => {
    const state = {
      networkEvents: {
        test: {
          '1': {
            events: [],
            total: 0,
            isWaterfallSupported: true,
            loading: false,
          },
        },
      },
    };
    render(<WaterfallChartContainer checkGroup="test" stepIndex={1} />, {
      state,
    });
    expect(screen.getByText('No waterfall data could be found for this step')).toBeInTheDocument();
  });
});

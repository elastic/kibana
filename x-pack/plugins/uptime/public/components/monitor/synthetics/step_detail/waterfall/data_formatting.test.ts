/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { colourPalette, getSeriesAndDomain } from './data_formatting';
import { NetworkItems } from './types';

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

describe('getSeriesAndDomain', () => {
  const networkItems: NetworkItems = [
    {
      timestamp: '2021-01-05T19:22:28.928Z',
      method: 'GET',
      url: 'https://unpkg.com/todomvc-app-css@2.0.4/index.css',
      status: 200,
      mimeType: 'text/css',
      requestSentTime: 18098833.175,
      requestStartTime: 18098835.439,
      loadEndTime: 18098957.145,
      timings: {
        connect: 81.10800000213203,
        wait: 34.577999998873565,
        receive: 0.5520000013348181,
        send: 0.3600000018195715,
        total: 123.97000000055414,
        proxy: -1,
        blocked: 0.8540000017092098,
        queueing: 2.263999998831423,
        ssl: 55.38700000033714,
        dns: 3.559999997378327,
      },
    },
    {
      timestamp: '2021-01-05T19:22:28.928Z',
      method: 'GET',
      url: 'https://unpkg.com/director@1.2.8/build/director.js',
      status: 200,
      mimeType: 'application/javascript',
      requestSentTime: 18098833.537,
      requestStartTime: 18098837.233999997,
      loadEndTime: 18098977.648000002,
      timings: {
        blocked: 84.54599999822676,
        receive: 3.068000001803739,
        queueing: 3.69700000010198,
        proxy: -1,
        total: 144.1110000014305,
        wait: 52.56100000042352,
        connect: -1,
        send: 0.2390000008745119,
        ssl: -1,
        dns: -1,
      },
    },
  ];

  const networkItemsWithoutFullTimings: NetworkItems = [
    networkItems[0],
    {
      timestamp: '2021-01-05T19:22:28.928Z',
      method: 'GET',
      url: 'file:///Users/dominiqueclarke/dev/synthetics/examples/todos/app/app.js',
      status: 0,
      mimeType: 'text/javascript',
      requestSentTime: 18098834.097,
      loadEndTime: 18098836.889999997,
      timings: {
        total: 2.7929999996558763,
        blocked: -1,
        ssl: -1,
        wait: -1,
        connect: -1,
        dns: -1,
        queueing: -1,
        send: -1,
        proxy: -1,
        receive: -1,
      },
    },
  ];

  const networkItemsWithoutAnyTimings: NetworkItems = [
    {
      timestamp: '2021-01-05T19:22:28.928Z',
      method: 'GET',
      url: 'file:///Users/dominiqueclarke/dev/synthetics/examples/todos/app/app.js',
      status: 0,
      mimeType: 'text/javascript',
      requestSentTime: 18098834.097,
      loadEndTime: 18098836.889999997,
      timings: {
        total: -1,
        blocked: -1,
        ssl: -1,
        wait: -1,
        connect: -1,
        dns: -1,
        queueing: -1,
        send: -1,
        proxy: -1,
        receive: -1,
      },
    },
  ];

  const networkItemsWithoutTimingsObject: NetworkItems = [
    {
      timestamp: '2021-01-05T19:22:28.928Z',
      method: 'GET',
      url: 'file:///Users/dominiqueclarke/dev/synthetics/examples/todos/app/app.js',
      status: 0,
      mimeType: 'text/javascript',
      requestSentTime: 18098834.097,
      loadEndTime: 18098836.889999997,
    },
  ];

  it('formats timings', () => {
    const actual = getSeriesAndDomain(networkItems);
    expect(actual).toMatchInlineSnapshot(`
      Object {
        "domain": Object {
          "max": 140.7760000010603,
          "min": 0,
        },
        "series": Array [
          Object {
            "config": Object {
              "colour": "#b9a888",
              "showTooltip": true,
              "tooltipProps": Object {
                "colour": "#b9a888",
                "value": "Queued / Blocked: 0.854ms",
              },
            },
            "x": 0,
            "y": 0.8540000017092098,
            "y0": 0,
          },
          Object {
            "config": Object {
              "colour": "#54b399",
              "showTooltip": true,
              "tooltipProps": Object {
                "colour": "#54b399",
                "value": "DNS: 3.560ms",
              },
            },
            "x": 0,
            "y": 4.413999999087537,
            "y0": 0.8540000017092098,
          },
          Object {
            "config": Object {
              "colour": "#da8b45",
              "showTooltip": true,
              "tooltipProps": Object {
                "colour": "#da8b45",
                "value": "Connecting: 25.721ms",
              },
            },
            "x": 0,
            "y": 30.135000000882428,
            "y0": 4.413999999087537,
          },
          Object {
            "config": Object {
              "colour": "#edc5a2",
              "showTooltip": true,
              "tooltipProps": Object {
                "colour": "#edc5a2",
                "value": "TLS: 55.387ms",
              },
            },
            "x": 0,
            "y": 85.52200000121957,
            "y0": 30.135000000882428,
          },
          Object {
            "config": Object {
              "colour": "#d36086",
              "showTooltip": true,
              "tooltipProps": Object {
                "colour": "#d36086",
                "value": "Sending request: 0.360ms",
              },
            },
            "x": 0,
            "y": 85.88200000303914,
            "y0": 85.52200000121957,
          },
          Object {
            "config": Object {
              "colour": "#b0c9e0",
              "showTooltip": true,
              "tooltipProps": Object {
                "colour": "#b0c9e0",
                "value": "Waiting (TTFB): 34.578ms",
              },
            },
            "x": 0,
            "y": 120.4600000019127,
            "y0": 85.88200000303914,
          },
          Object {
            "config": Object {
              "colour": "#ca8eae",
              "showTooltip": true,
              "tooltipProps": Object {
                "colour": "#ca8eae",
                "value": "Content downloading (CSS): 0.552ms",
              },
            },
            "x": 0,
            "y": 121.01200000324752,
            "y0": 120.4600000019127,
          },
          Object {
            "config": Object {
              "colour": "#b9a888",
              "showTooltip": true,
              "tooltipProps": Object {
                "colour": "#b9a888",
                "value": "Queued / Blocked: 84.546ms",
              },
            },
            "x": 1,
            "y": 84.90799999795854,
            "y0": 0.3619999997317791,
          },
          Object {
            "config": Object {
              "colour": "#d36086",
              "showTooltip": true,
              "tooltipProps": Object {
                "colour": "#d36086",
                "value": "Sending request: 0.239ms",
              },
            },
            "x": 1,
            "y": 85.14699999883305,
            "y0": 84.90799999795854,
          },
          Object {
            "config": Object {
              "colour": "#b0c9e0",
              "showTooltip": true,
              "tooltipProps": Object {
                "colour": "#b0c9e0",
                "value": "Waiting (TTFB): 52.561ms",
              },
            },
            "x": 1,
            "y": 137.70799999925657,
            "y0": 85.14699999883305,
          },
          Object {
            "config": Object {
              "colour": "#9170b8",
              "showTooltip": true,
              "tooltipProps": Object {
                "colour": "#9170b8",
                "value": "Content downloading (JS): 3.068ms",
              },
            },
            "x": 1,
            "y": 140.7760000010603,
            "y0": 137.70799999925657,
          },
        ],
      }
    `);
  });

  it('handles formatting when only total timing values are available', () => {
    const actual = getSeriesAndDomain(networkItemsWithoutFullTimings);
    expect(actual).toMatchInlineSnapshot(`
      Object {
        "domain": Object {
          "max": 121.01200000324752,
          "min": 0,
        },
        "series": Array [
          Object {
            "config": Object {
              "colour": "#b9a888",
              "showTooltip": true,
              "tooltipProps": Object {
                "colour": "#b9a888",
                "value": "Queued / Blocked: 0.854ms",
              },
            },
            "x": 0,
            "y": 0.8540000017092098,
            "y0": 0,
          },
          Object {
            "config": Object {
              "colour": "#54b399",
              "showTooltip": true,
              "tooltipProps": Object {
                "colour": "#54b399",
                "value": "DNS: 3.560ms",
              },
            },
            "x": 0,
            "y": 4.413999999087537,
            "y0": 0.8540000017092098,
          },
          Object {
            "config": Object {
              "colour": "#da8b45",
              "showTooltip": true,
              "tooltipProps": Object {
                "colour": "#da8b45",
                "value": "Connecting: 25.721ms",
              },
            },
            "x": 0,
            "y": 30.135000000882428,
            "y0": 4.413999999087537,
          },
          Object {
            "config": Object {
              "colour": "#edc5a2",
              "showTooltip": true,
              "tooltipProps": Object {
                "colour": "#edc5a2",
                "value": "TLS: 55.387ms",
              },
            },
            "x": 0,
            "y": 85.52200000121957,
            "y0": 30.135000000882428,
          },
          Object {
            "config": Object {
              "colour": "#d36086",
              "showTooltip": true,
              "tooltipProps": Object {
                "colour": "#d36086",
                "value": "Sending request: 0.360ms",
              },
            },
            "x": 0,
            "y": 85.88200000303914,
            "y0": 85.52200000121957,
          },
          Object {
            "config": Object {
              "colour": "#b0c9e0",
              "showTooltip": true,
              "tooltipProps": Object {
                "colour": "#b0c9e0",
                "value": "Waiting (TTFB): 34.578ms",
              },
            },
            "x": 0,
            "y": 120.4600000019127,
            "y0": 85.88200000303914,
          },
          Object {
            "config": Object {
              "colour": "#ca8eae",
              "showTooltip": true,
              "tooltipProps": Object {
                "colour": "#ca8eae",
                "value": "Content downloading (CSS): 0.552ms",
              },
            },
            "x": 0,
            "y": 121.01200000324752,
            "y0": 120.4600000019127,
          },
          Object {
            "config": Object {
              "colour": "#9170b8",
              "showTooltip": true,
              "tooltipProps": Object {
                "colour": "#9170b8",
                "value": "Content downloading (JS): 2.793ms",
              },
            },
            "x": 1,
            "y": 3.714999998046551,
            "y0": 0.9219999983906746,
          },
        ],
      }
    `);
  });

  it('handles formatting when there is no timing information available', () => {
    const actual = getSeriesAndDomain(networkItemsWithoutAnyTimings);
    expect(actual).toMatchInlineSnapshot(`
      Object {
        "domain": Object {
          "max": 0,
          "min": 0,
        },
        "series": Array [
          Object {
            "config": Object {
              "colour": "",
              "showTooltip": false,
              "tooltipProps": undefined,
            },
            "x": 0,
            "y": 0,
            "y0": 0,
          },
        ],
      }
    `);
  });

  it('handles formatting when the timings object is undefined', () => {
    const actual = getSeriesAndDomain(networkItemsWithoutTimingsObject);
    expect(actual).toMatchInlineSnapshot(`
      Object {
        "domain": Object {
          "max": 0,
          "min": 0,
        },
        "series": Array [
          Object {
            "config": Object {
              "showTooltip": false,
            },
            "x": 0,
            "y": 0,
            "y0": 0,
          },
        ],
      }
    `);
  });
});

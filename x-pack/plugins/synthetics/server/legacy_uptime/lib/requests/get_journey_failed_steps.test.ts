/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getJourneyFailedSteps } from './get_journey_failed_steps';
import { mockSearchResult } from './helper';

describe('getJourneyFailedSteps', () => {
  let mockData: unknown;

  beforeEach(() => {
    mockData = {
      _id: 'uTjtNHoBu1okBtVwOgMb',
      _source: {
        '@timestamp': '2021-06-22T18:13:19.013Z',
        synthetics: {
          package_version: '1.0.0-beta.2',
          journey: {
            name: 'inline',
            id: 'inline',
          },
          payload: {
            source:
              'async ({ page, browser, params }) => {\n        scriptFn.apply(null, [core_1.step, page, browser, params]);\n    }',
            params: {},
          },
          index: 0,
          type: 'journey/start',
        },
        monitor: {
          name: 'My Monitor - inline',
          timespan: {
            lt: '2021-06-22T18:14:19.013Z',
            gte: '2021-06-22T18:13:19.013Z',
          },
          check_group: '85946468-d385-11eb-8848-acde48001122',
          id: 'my-browser-monitor-inline',
          type: 'browser',
          status: 'up',
        },
      },
    };
  });

  it('formats failed steps', async () => {
    expect(
      await getJourneyFailedSteps({
        uptimeEsClient: mockSearchResult(mockData),
        checkGroups: ['chg1', 'chg2'],
      })
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "@timestamp": "2021-06-22T18:13:19.013Z",
          "_id": "uTjtNHoBu1okBtVwOgMb",
          "monitor": Object {
            "check_group": "85946468-d385-11eb-8848-acde48001122",
            "id": "my-browser-monitor-inline",
            "name": "My Monitor - inline",
            "status": "up",
            "timespan": Object {
              "gte": "2021-06-22T18:13:19.013Z",
              "lt": "2021-06-22T18:14:19.013Z",
            },
            "type": "browser",
          },
          "synthetics": Object {
            "index": 0,
            "journey": Object {
              "id": "inline",
              "name": "inline",
            },
            "package_version": "1.0.0-beta.2",
            "payload": Object {
              "params": Object {},
              "source": "async ({ page, browser, params }) => {
              scriptFn.apply(null, [core_1.step, page, browser, params]);
          }",
            },
            "type": "journey/start",
          },
          "timestamp": "2021-06-22T18:13:19.013Z",
        },
      ]
    `);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getJourneySteps, formatStepTypes } from './get_journey_steps';
import { getUptimeESMockClient } from './helper';

describe('getJourneySteps request module', () => {
  describe('formatStepTypes', () => {
    it('returns default steps if none are provided', () => {
      expect(formatStepTypes()).toMatchInlineSnapshot(`
        Array [
          "step/end",
          "stderr",
          "cmd/status",
          "step/screenshot",
        ]
      `);
    });

    it('returns provided step array if isArray', () => {
      expect(formatStepTypes(['step/end', 'stderr'])).toMatchInlineSnapshot(`
        Array [
          "step/end",
          "stderr",
        ]
      `);
    });

    it('returns provided step string in an array', () => {
      expect(formatStepTypes('step/end')).toMatchInlineSnapshot(`
        Array [
          "step/end",
        ]
      `);
    });
  });

  describe('getJourneySteps', () => {
    let data: any;
    beforeEach(() => {
      data = {
        body: {
          took: 7,
          timed_out: false,
          _shards: {
            total: 2,
            successful: 2,
            skipped: 0,
            failed: 0,
          },
          hits: {
            total: {
              value: 2,
              relation: 'eq',
            },
            max_score: null,
            hits: [
              {
                _index: 'heartbeat-8.0.0-2020.12.15-000002',
                _id: 'o6myXncBFt2V8m6r6z-r',
                _score: null,
                _source: {
                  cloud: {
                    availability_zone: 'europe-west1-c',
                    instance: {
                      name: 'gke-edge-oblt-edge-oblt-pool-c9faf257-p1cm',
                      id: '5670181226092199621',
                    },
                    provider: 'gcp',
                    machine: {
                      type: 'n1-standard-4',
                    },
                    project: {
                      id: 'elastic-observability',
                    },
                    account: {
                      id: 'elastic-observability',
                    },
                  },
                  observer: {
                    geo: {
                      continent_name: 'Spain',
                      region_iso_code: 'MD',
                      city_name: 'Madrid',
                      country_iso_code: 'ES',
                      name: 'spa-heartbeat',
                      location: '40.4167, -3.7037902',
                      region_name: 'Madrid',
                    },
                    hostname: 'gke-edge-oblt-edge-oblt-pool-c9faf257-p1cm',
                  },
                  agent: {
                    name: 'gke-edge-oblt-edge-oblt-pool-c9faf257-p1cm',
                    id: '84deb996-6143-4934-b56f-df239e3e7997',
                    ephemeral_id: 'aa88d3ea-2475-4c43-8e6b-bb66df6f485d',
                    type: 'heartbeat',
                    version: '8.0.0',
                  },
                  '@timestamp': '2021-02-01T17:45:19.001Z',
                  ecs: {
                    version: '1.7.0',
                  },
                  synthetics: {
                    package_version: '0.0.1-alpha.8',
                    journey: {
                      name: 'inline',
                      id: 'inline',
                    },
                    payload: {
                      start: 1736175.003334449,
                      end: 1736188.569649825,
                      source: "async () => {\n    await page.goto('https://www.elastic.co');\n}",
                      url: 'https://www.elastic.co/',
                      status: 'succeeded',
                    },
                    step: {
                      name: 'load homepage',
                      index: 1,
                    },
                    type: 'step/end',
                  },
                  monitor: {
                    name: 'My Monitor',
                    timespan: {
                      lt: '2021-02-01T17:46:19.001Z',
                      gte: '2021-02-01T17:45:19.001Z',
                    },
                    id: 'my-monitor',
                    check_group: '2bf952dc-64b5-11eb-8b3b-42010a84000d',
                    type: 'browser',
                  },
                  event: {
                    dataset: 'uptime',
                  },
                  url: {
                    path: '/',
                    scheme: 'https',
                    port: 443,
                    domain: 'www.elastic.co',
                    full: 'https://www.elastic.co/',
                  },
                },
                sort: [1, 1612201519001],
              },
              {
                _index: 'heartbeat-8.0.0-2020.12.15-000002',
                _id: 'IjqzXncBn2sjqrYxYoCG',
                _score: null,
                _source: {
                  cloud: {
                    availability_zone: 'europe-west1-c',
                    instance: {
                      name: 'gke-edge-oblt-edge-oblt-pool-c9faf257-p1cm',
                      id: '5670181226092199621',
                    },
                    provider: 'gcp',
                    machine: {
                      type: 'n1-standard-4',
                    },
                    project: {
                      id: 'elastic-observability',
                    },
                    account: {
                      id: 'elastic-observability',
                    },
                  },
                  observer: {
                    geo: {
                      region_iso_code: 'MD',
                      continent_name: 'Spain',
                      city_name: 'Madrid',
                      country_iso_code: 'ES',
                      name: 'spa-heartbeat',
                      region_name: 'Madrid',
                      location: '40.4167, -3.7037902',
                    },
                    hostname: 'gke-edge-oblt-edge-oblt-pool-c9faf257-p1cm',
                  },
                  agent: {
                    name: 'gke-edge-oblt-edge-oblt-pool-c9faf257-p1cm',
                    id: '84deb996-6143-4934-b56f-df239e3e7997',
                    type: 'heartbeat',
                    ephemeral_id: 'aa88d3ea-2475-4c43-8e6b-bb66df6f485d',
                    version: '8.0.0',
                  },
                  '@timestamp': '2021-02-01T17:45:49.944Z',
                  ecs: {
                    version: '1.7.0',
                  },
                  synthetics: {
                    package_version: '0.0.1-alpha.8',
                    journey: {
                      name: 'inline',
                      id: 'inline',
                    },
                    payload: {
                      start: 1736188.611455538,
                      end: 1736219.544287728,
                      source:
                        "async () => {\n    await page.hover('css=[data-nav-item=products]');\n}",
                      url: 'https://www.elastic.co/',
                      status: 'failed',
                    },
                    step: {
                      name: 'hover over products menu',
                      index: 2,
                    },
                    error: {
                      stack:
                        'page.hover: Timeout 30000ms exceeded.\n=========================== logs ===========================\nwaiting for selector "css=[data-nav-item=products]"\n  selector resolved to visible <li data-nav-item="products" class="jsx-4008395266 n…>…</li>\n============================================================\nNote: use DEBUG=pw:api environment variable and rerun to capture Playwright logs.: \n    at Connection.sendMessageToServer (/usr/share/heartbeat/.node/node/lib/node_modules/@elastic/synthetics/node_modules/playwright-chromium/lib/client/connection.js:69:15)\n    at Proxy.<anonymous> (/usr/share/heartbeat/.node/node/lib/node_modules/@elastic/synthetics/node_modules/playwright-chromium/lib/client/channelOwner.js:54:53)\n    at /usr/share/heartbeat/.node/node/lib/node_modules/@elastic/synthetics/node_modules/playwright-chromium/lib/client/frame.js:304:33\n    at Frame._wrapApiCall (/usr/share/heartbeat/.node/node/lib/node_modules/@elastic/synthetics/node_modules/playwright-chromium/lib/client/channelOwner.js:80:34)\n    at Frame.hover (/usr/share/heartbeat/.node/node/lib/node_modules/@elastic/synthetics/node_modules/playwright-chromium/lib/client/frame.js:303:21)\n    at /usr/share/heartbeat/.node/node/lib/node_modules/@elastic/synthetics/node_modules/playwright-chromium/lib/client/page.js:430:60\n    at Page._attributeToPage (/usr/share/heartbeat/.node/node/lib/node_modules/@elastic/synthetics/node_modules/playwright-chromium/lib/client/page.js:202:20)\n    at Page.hover (/usr/share/heartbeat/.node/node/lib/node_modules/@elastic/synthetics/node_modules/playwright-chromium/lib/client/page.js:430:21)\n    at Step.eval [as callback] (eval at loadInlineScript (/usr/share/heartbeat/.node/node/lib/node_modules/@elastic/synthetics/src/cli.ts:52:20), <anonymous>:5:16)\n    at Runner.runStep (/usr/share/heartbeat/.node/node/lib/node_modules/@elastic/synthetics/src/core/runner.ts:189:18)',
                      name: 'TimeoutError',
                      message: 'page.hover: Timeout 30000ms exceeded.',
                    },
                    type: 'step/end',
                  },
                  monitor: {
                    name: 'My Monitor',
                    timespan: {
                      lt: '2021-02-01T17:46:49.945Z',
                      gte: '2021-02-01T17:45:49.945Z',
                    },
                    id: 'my-monitor',
                    check_group: '2bf952dc-64b5-11eb-8b3b-42010a84000d',
                    type: 'browser',
                  },
                  event: {
                    dataset: 'uptime',
                  },
                  url: {
                    path: '/',
                    scheme: 'https',
                    port: 443,
                    domain: 'www.elastic.co',
                    full: 'https://www.elastic.co/',
                  },
                },
                sort: [2, 1612201549944],
              },
            ],
          },
        },
      };
    });

    it('formats ES result', async () => {
      const { esClient: mockEsClient, uptimeEsClient } = getUptimeESMockClient();

      mockEsClient.search.mockResolvedValueOnce(data as any);
      const result: any = await getJourneySteps({
        uptimeEsClient,
        checkGroup: '2bf952dc-64b5-11eb-8b3b-42010a84000d',
      });
      expect(mockEsClient.search).toHaveBeenCalledTimes(1);
      const call: any = mockEsClient.search.mock.calls[0][0];

      // check that default `synthetics.type` value is supplied,
      expect(call.body.query.bool.filter[0]).toMatchInlineSnapshot(`
        Object {
          "terms": Object {
            "synthetics.type": Array [
              "step/end",
              "stderr",
              "cmd/status",
              "step/screenshot",
            ],
          },
        }
      `);

      // given check group is used for the terms filter
      expect(call.body.query.bool.filter[1]).toMatchInlineSnapshot(`
        Object {
          "term": Object {
            "monitor.check_group": "2bf952dc-64b5-11eb-8b3b-42010a84000d",
          },
        }
      `);

      // should sort by step index, then timestamp
      expect(call.body.sort).toMatchInlineSnapshot(`
        Array [
          Object {
            "synthetics.step.index": Object {
              "order": "asc",
            },
          },
          Object {
            "@timestamp": Object {
              "order": "asc",
            },
          },
        ]
      `);

      expect(call.body.size).toBe(500);

      expect(result).toHaveLength(2);
      result.forEach((step: any) => {
        expect(['2021-02-01T17:45:19.001Z', '2021-02-01T17:45:49.944Z']).toContain(step.timestamp);
        expect(['o6myXncBFt2V8m6r6z-r', 'IjqzXncBn2sjqrYxYoCG']).toContain(step.docId);
        expect(step.synthetics.screenshotExists).toBeDefined();
      });
    });

    it('notes screenshot exists when a document of type step/screenshot is included', async () => {
      const { esClient: mockEsClient, uptimeEsClient } = getUptimeESMockClient();

      data.body.hits.hits[0]._source.synthetics.type = 'step/screenshot';
      data.body.hits.hits[0]._source.synthetics.step.index = 2;
      mockEsClient.search.mockResolvedValueOnce(data as any);

      const result: any = await getJourneySteps({
        uptimeEsClient,
        checkGroup: '2bf952dc-64b5-11eb-8b3b-42010a84000d',
        stepTypes: ['stderr', 'step/end'],
      });

      const call: any = mockEsClient.search.mock.calls[0][0];

      // assert that filters for only the provided step types are used
      expect(call.body.query.bool.filter[0]).toMatchInlineSnapshot(`
        Object {
          "terms": Object {
            "synthetics.type": Array [
              "stderr",
              "step/end",
            ],
          },
        }
      `);

      expect(result).toHaveLength(1);
      expect(result[0].synthetics.screenshotExists).toBe(true);
    });
  });
});

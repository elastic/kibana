/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JourneyStep } from '../../../common/runtime_types/ping/synthetics';
import { getJourneySteps, formatSyntheticEvents } from './get_journey_steps';
import { getUptimeESMockClient } from './helper';

describe('getJourneySteps request module', () => {
  describe('formatStepTypes', () => {
    it('returns default steps if none are provided', () => {
      expect(formatSyntheticEvents()).toMatchInlineSnapshot(`
        Array [
          "cmd/status",
          "journey/browserconsole",
          "step/end",
          "step/screenshot",
          "step/screenshot_ref",
        ]
      `);
    });

    it('returns provided step array if isArray', () => {
      expect(formatSyntheticEvents(['step/end', 'stderr'])).toMatchInlineSnapshot(`
        Array [
          "step/end",
          "stderr",
        ]
      `);
    });

    it('returns provided step string in an array', () => {
      expect(formatSyntheticEvents('step/end')).toMatchInlineSnapshot(`
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
          hits: {
            hits: [
              {
                _id: 'o6myXncBFt2V8m6r6z-r',
                _source: {
                  '@timestamp': '2021-02-01T17:45:19.001Z',
                  synthetics: {
                    package_version: '0.0.1-alpha.8',
                    journey: {
                      name: 'inline',
                      id: 'inline',
                    },
                    step: {
                      name: 'load homepage',
                      index: 1,
                    },
                    type: 'step/end',
                  },
                  monitor: {
                    name: 'My Monitor',
                    id: 'my-monitor',
                    check_group: '2bf952dc-64b5-11eb-8b3b-42010a84000d',
                    type: 'browser',
                  },
                },
              },
              {
                _id: 'IjqzXncBn2sjqrYxYoCG',
                _source: {
                  '@timestamp': '2021-02-01T17:45:49.944Z',
                  synthetics: {
                    package_version: '0.0.1-alpha.8',
                    journey: {
                      name: 'inline',
                      id: 'inline',
                    },
                    step: {
                      name: 'hover over products menu',
                      index: 2,
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
                },
              },
            ],
          },
        },
      };
    });

    it('formats ES result', async () => {
      const { esClient: mockEsClient, uptimeEsClient } = getUptimeESMockClient();

      mockEsClient.search.mockResolvedValueOnce(data);
      const result: JourneyStep[] = await getJourneySteps({
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
              "cmd/status",
              "journey/browserconsole",
              "step/end",
              "step/screenshot",
              "step/screenshot_ref",
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

      expect(result).toHaveLength(2);
      // `getJourneySteps` is responsible for formatting these fields, so we need to check them
      result.forEach((step: JourneyStep) => {
        expect(['2021-02-01T17:45:19.001Z', '2021-02-01T17:45:49.944Z']).toContain(
          step['@timestamp']
        );
        expect(['o6myXncBFt2V8m6r6z-r', 'IjqzXncBn2sjqrYxYoCG']).toContain(step._id);
        expect(step.synthetics.isFullScreenshot).toBeDefined();
      });
    });

    it('notes screenshot exists when a document of type step/screenshot is included', async () => {
      const { esClient: mockEsClient, uptimeEsClient } = getUptimeESMockClient();

      data.body.hits.hits[0]._source.synthetics.type = 'step/screenshot';
      data.body.hits.hits[0]._source.synthetics.step.index = 2;
      mockEsClient.search.mockResolvedValueOnce(data);

      const result: JourneyStep[] = await getJourneySteps({
        uptimeEsClient,
        checkGroup: '2bf952dc-64b5-11eb-8b3b-42010a84000d',
        syntheticEventTypes: ['stderr', 'step/end'],
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
      expect(result[0].synthetics.isFullScreenshot).toBe(true);
    });
  });
});

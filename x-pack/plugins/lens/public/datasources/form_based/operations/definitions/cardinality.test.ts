/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildExpression, parseExpression } from '@kbn/expressions-plugin/common';
import { operationDefinitionMap } from '.';

describe('unique values function', () => {
  describe('getGroupByKey', () => {
    const getKey = operationDefinitionMap.unique_count.getGroupByKey!;
    const expressionToKey = (expression: string) =>
      getKey(buildExpression(parseExpression(expression))) as string;
    describe('generates unique keys based on configuration', () => {
      const keys = [
        // group 1
        [
          'aggCardinality id="0" enabled=true schema="metric" field="bytes" emptyAsNull=false',
          'aggCardinality id="1" enabled=true schema="metric" field="bytes" emptyAsNull=false',
        ],
        // group 2
        [
          'aggFilteredMetric id="2" enabled=true schema="metric" \n  customBucket={aggFilter id="2-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"GA\\" "}} \n  customMetric={aggCardinality id="2-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}',
          'aggFilteredMetric id="3" enabled=true schema="metric" \n  customBucket={aggFilter id="3-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"GA\\" "}} \n  customMetric={aggCardinality id="3-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}',
        ],
        // group 3
        [
          'aggFilteredMetric id="4" enabled=true schema="metric" \n  customBucket={aggFilter id="4-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"AL\\" "}} \n  customMetric={aggCardinality id="4-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}',
          'aggFilteredMetric id="5" enabled=true schema="metric" \n  customBucket={aggFilter id="5-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"AL\\" "}} \n  customMetric={aggCardinality id="5-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}',
        ],
        // group 4
        [
          'aggFilteredMetric id="6" enabled=true schema="metric" \n  customBucket={aggFilter id="6-filter" enabled=true schema="bucket" filter={lucene q="\\"geo.dest: \\\\\\"AL\\\\\\" \\""}} \n  customMetric={aggCardinality id="6-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}',
          'aggFilteredMetric id="7" enabled=true schema="metric" \n  customBucket={aggFilter id="7-filter" enabled=true schema="bucket" filter={lucene q="\\"geo.dest: \\\\\\"AL\\\\\\" \\""}} \n  customMetric={aggCardinality id="7-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}',
        ],
        // group 5
        [
          'aggFilteredMetric id="8" enabled=true schema="metric" \n  customBucket={aggFilter id="8-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"AL\\" "} timeWindow="1m"} \n  customMetric={aggCardinality id="8-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}',
          'aggFilteredMetric id="9" enabled=true schema="metric" \n  customBucket={aggFilter id="9-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"AL\\" "} timeWindow="1m"} \n  customMetric={aggCardinality id="9-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}',
        ],
        // check emptyAsNull cases
        [
          'aggCardinality id="10" enabled=true schema="metric" field="bytes" emptyAsNull=true',
          'aggCardinality id="11" enabled=true schema="metric" field="bytes" emptyAsNull=true',
        ],
        [
          'aggFilteredMetric id="12" enabled=true schema="metric" \n  customBucket={aggFilter id="2-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"GA\\" "}} \n  customMetric={aggCardinality id="2-metric" enabled=true schema="metric" field="bytes" emptyAsNull=true}',
          'aggFilteredMetric id="13" enabled=true schema="metric" \n  customBucket={aggFilter id="3-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"GA\\" "}} \n  customMetric={aggCardinality id="3-metric" enabled=true schema="metric" field="bytes" emptyAsNull=true}',
        ],
      ].map((group) => group.map(expressionToKey));

      it.each(keys.map((group, i) => ({ group })))('%#', ({ group: thisGroup }) => {
        expect(thisGroup[0]).toEqual(thisGroup[1]);
        const otherGroups = keys.filter((group) => group !== thisGroup);
        for (const otherGroup of otherGroups) {
          expect(thisGroup[0]).not.toEqual(otherGroup[0]);
        }
      });

      it('snapshot', () => {
        expect(keys).toMatchInlineSnapshot(`
          Array [
            Array [
              "aggCardinality-bytes-false-undefined",
              "aggCardinality-bytes-false-undefined",
            ],
            Array [
              "aggCardinality-filtered-bytes-false-undefined-undefined-kql-geo.dest: \\"GA\\" ",
              "aggCardinality-filtered-bytes-false-undefined-undefined-kql-geo.dest: \\"GA\\" ",
            ],
            Array [
              "aggCardinality-filtered-bytes-false-undefined-undefined-kql-geo.dest: \\"AL\\" ",
              "aggCardinality-filtered-bytes-false-undefined-undefined-kql-geo.dest: \\"AL\\" ",
            ],
            Array [
              "aggCardinality-filtered-bytes-false-undefined-undefined-lucene-\\"geo.dest: \\\\\\"AL\\\\\\" \\"",
              "aggCardinality-filtered-bytes-false-undefined-undefined-lucene-\\"geo.dest: \\\\\\"AL\\\\\\" \\"",
            ],
            Array [
              "aggCardinality-filtered-bytes-false-1m-undefined-kql-geo.dest: \\"AL\\" ",
              "aggCardinality-filtered-bytes-false-1m-undefined-kql-geo.dest: \\"AL\\" ",
            ],
            Array [
              "aggCardinality-bytes-true-undefined",
              "aggCardinality-bytes-true-undefined",
            ],
            Array [
              "aggCardinality-filtered-bytes-true-undefined-undefined-kql-geo.dest: \\"GA\\" ",
              "aggCardinality-filtered-bytes-true-undefined-undefined-kql-geo.dest: \\"GA\\" ",
            ],
          ]
        `);
      });
    });

    it('returns undefined for aggs from different operation classes', () => {
      expect(
        expressionToKey(
          'aggSum id="0" enabled=true schema="metric" field="bytes" emptyAsNull=false'
        )
      ).toBeUndefined();
      expect(
        expressionToKey(
          'aggFilteredMetric id="2" enabled=true schema="metric" \n  customBucket={aggFilter id="2-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"GA\\" "}} \n  customMetric={aggSum id="2-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}'
        )
      ).toBeUndefined();
    });
  });
});

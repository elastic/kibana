/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildExpression,
  ExpressionAstExpressionBuilder,
  parseExpression,
} from '@kbn/expressions-plugin/common';
import { operationDefinitionMap } from '.';
import { OriginalColumn } from '../../to_expression';

describe('unique values function', () => {
  describe('optimizeEsAggs', () => {
    const buildMapsFromAggBuilders = (aggs: ExpressionAstExpressionBuilder[]) => {
      const esAggsIdMap: Record<string, OriginalColumn[]> = {};
      const aggsToIdsMap = new Map();
      aggs.forEach((builder, i) => {
        const esAggsId = `col-${i}-${i}`;
        esAggsIdMap[esAggsId] = [{ id: `original-${i}` } as OriginalColumn];
        aggsToIdsMap.set(builder, esAggsId);
      });
      return {
        esAggsIdMap,
        aggsToIdsMap,
      };
    };

    it('consolidates duplicate aggs', () => {
      const aggs = [
        // group 1
        'aggCardinality id="0" enabled=true schema="metric" field="bytes" emptyAsNull=false',
        'aggCardinality id="1" enabled=true schema="metric" field="bytes" emptyAsNull=false',
        // group 2
        'aggFilteredMetric id="2" enabled=true schema="metric" \n  customBucket={aggFilter id="2-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"GA\\" "}} \n  customMetric={aggCardinality id="2-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}',
        'aggFilteredMetric id="3" enabled=true schema="metric" \n  customBucket={aggFilter id="3-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"GA\\" "}} \n  customMetric={aggCardinality id="3-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}',
        // group 3
        'aggFilteredMetric id="4" enabled=true schema="metric" \n  customBucket={aggFilter id="4-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"AL\\" "}} \n  customMetric={aggCardinality id="4-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}',
        'aggFilteredMetric id="5" enabled=true schema="metric" \n  customBucket={aggFilter id="5-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"AL\\" "}} \n  customMetric={aggCardinality id="5-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}',
        // group 4
        'aggFilteredMetric id="6" enabled=true schema="metric" \n  customBucket={aggFilter id="6-filter" enabled=true schema="bucket" filter={lucene q="\\"geo.dest: \\\\\\"AL\\\\\\" \\""}} \n  customMetric={aggCardinality id="6-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}',
        'aggFilteredMetric id="7" enabled=true schema="metric" \n  customBucket={aggFilter id="7-filter" enabled=true schema="bucket" filter={lucene q="\\"geo.dest: \\\\\\"AL\\\\\\" \\""}} \n  customMetric={aggCardinality id="7-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}',
        // group 5
        'aggFilteredMetric id="8" enabled=true schema="metric" \n  customBucket={aggFilter id="8-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"AL\\" "} timeWindow="1m"} \n  customMetric={aggCardinality id="8-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}',
        'aggFilteredMetric id="9" enabled=true schema="metric" \n  customBucket={aggFilter id="9-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"AL\\" "} timeWindow="1m"} \n  customMetric={aggCardinality id="9-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}',
        // group 6 (unrelated aggs)
        'aggFilteredMetric id="10" enabled=true schema="metric" \n  customBucket={aggFilter id="10-filter" enabled=true schema="bucket" filter={kql q="bytes: *"}} \n  customMetric={aggTopMetrics id="10-metric" enabled=true schema="metric" field="bytes" size=1 sortOrder="desc" sortField="timestamp"}',
        'aggFilteredMetric id="11" enabled=true schema="metric" \n  customBucket={aggFilter id="11-filter" enabled=true schema="bucket" filter={kql q="bytes: *"}} \n  customMetric={aggTopMetrics id="11-metric" enabled=true schema="metric" field="bytes" size=1 sortOrder="desc" sortField="timestamp"}',
      ].map((expression) => buildExpression(parseExpression(expression)));

      const { esAggsIdMap, aggsToIdsMap } = buildMapsFromAggBuilders(aggs);

      const { esAggsIdMap: newIdMap, aggs: newAggs } = operationDefinitionMap.unique_count
        .optimizeEsAggs!(aggs, esAggsIdMap, aggsToIdsMap);

      expect(newAggs).toHaveLength(7);

      expect(newIdMap).toMatchInlineSnapshot(`
        Object {
          "col-0-0": Array [
            Object {
              "id": "original-0",
            },
            Object {
              "id": "original-1",
            },
          ],
          "col-10-10": Array [
            Object {
              "id": "original-10",
            },
          ],
          "col-11-11": Array [
            Object {
              "id": "original-11",
            },
          ],
          "col-2-2": Array [
            Object {
              "id": "original-2",
            },
            Object {
              "id": "original-3",
            },
          ],
          "col-4-4": Array [
            Object {
              "id": "original-4",
            },
            Object {
              "id": "original-5",
            },
          ],
          "col-6-6": Array [
            Object {
              "id": "original-6",
            },
            Object {
              "id": "original-7",
            },
          ],
          "col-8-8": Array [
            Object {
              "id": "original-8",
            },
            Object {
              "id": "original-9",
            },
          ],
        }
      `);

      expect(newAggs.map((agg) => agg.toAst())).toMatchSnapshot();
    });
  });
});

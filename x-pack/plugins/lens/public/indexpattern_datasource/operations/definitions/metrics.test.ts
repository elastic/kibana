/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildExpression,
  buildExpressionFunction,
  ExpressionAstExpressionBuilder,
  parseExpression,
} from '@kbn/expressions-plugin/common';
import { OriginalColumn } from '../../to_expression';
import { operationDefinitionMap } from '.';

const medianOperation = operationDefinitionMap.median;
const sumOperation = operationDefinitionMap.sum;

describe('metrics', () => {
  describe('optimizeEsAggs', () => {
    const makeEsAggBuilder = (name: string, params: object) =>
      buildExpression({
        type: 'expression',
        chain: [buildExpressionFunction(name, params).toAst()],
      });

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

    it('should collapse aggs with matching parameters', () => {
      const field1 = 'field1';
      const field2 = 'field2';
      const timeShift1 = '1d';
      const timeShift2 = '2d';

      const aggConfigs = [
        // group 1
        {
          enabled: true,
          schema: 'metric',
          field: field1,
          timeShift: undefined,
          emptyAsNull: true,
        },
        {
          enabled: true,
          schema: 'metric',
          field: field1,
          timeShift: undefined,
          emptyAsNull: true,
        },
        // group 2
        {
          enabled: true,
          schema: 'metric',
          field: field1,
          timeShift: undefined,
          emptyAsNull: false,
        },
        {
          enabled: true,
          schema: 'metric',
          field: field1,
          timeShift: undefined,
          emptyAsNull: undefined,
        },
        // group 3
        {
          enabled: true,
          schema: 'metric',
          field: field2,
          timeShift: undefined,
          emptyAsNull: undefined,
        },
        {
          enabled: true,
          schema: 'metric',
          field: field2,
          timeShift: undefined,
          emptyAsNull: undefined,
        },
        // group 4
        {
          enabled: true,
          schema: 'metric',
          field: field2,
          timeShift: timeShift1,
          emptyAsNull: undefined,
        },
        {
          enabled: true,
          schema: 'metric',
          field: field2,
          timeShift: timeShift1,
          emptyAsNull: undefined,
        },
        // group 5
        {
          enabled: true,
          schema: 'metric',
          field: field2,
          timeShift: timeShift2,
          emptyAsNull: undefined,
        },
        {
          enabled: true,
          schema: 'metric',
          field: field2,
          timeShift: timeShift2,
          emptyAsNull: undefined,
        },
      ];

      const aggs = aggConfigs.map((config, index) =>
        makeEsAggBuilder('aggMedian', { ...config, id: index + 1 })
      );

      const { esAggsIdMap, aggsToIdsMap } = buildMapsFromAggBuilders(aggs);

      const { esAggsIdMap: newIdMap, aggs: newAggs } = medianOperation.optimizeEsAggs!(
        aggs,
        esAggsIdMap,
        aggsToIdsMap
      );

      expect(newAggs.length).toBe(5);

      expect(newAggs[0].functions[0].getArgument('field')![0]).toBe(field1);
      expect(newAggs[0].functions[0].getArgument('timeShift')).toBeUndefined();
      expect(newAggs[0].functions[0].getArgument('emptyAsNull')![0]).toBe(true);

      expect(newAggs[1].functions[0].getArgument('field')![0]).toBe(field1);
      expect(newAggs[1].functions[0].getArgument('timeShift')).toBeUndefined();
      expect(newAggs[1].functions[0].getArgument('emptyAsNull')![0]).toBe(false);

      expect(newAggs[2].functions[0].getArgument('field')![0]).toBe(field2);
      expect(newAggs[2].functions[0].getArgument('timeShift')).toBeUndefined();
      expect(newAggs[2].functions[0].getArgument('emptyAsNull')).toBeUndefined();

      expect(newAggs[3].functions[0].getArgument('field')![0]).toBe(field2);
      expect(newAggs[3].functions[0].getArgument('timeShift')![0]).toBe(timeShift1);
      expect(newAggs[3].functions[0].getArgument('emptyAsNull')).toBeUndefined();

      expect(newAggs[4].functions[0].getArgument('field')![0]).toBe(field2);
      expect(newAggs[4].functions[0].getArgument('timeShift')![0]).toBe(timeShift2);
      expect(newAggs[4].functions[0].getArgument('emptyAsNull')).toBeUndefined();

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

      expect(newAggs).toMatchSnapshot();
    });

    it('should collapse filtered aggs with matching parameters', () => {
      const aggs = [
        // group 1
        'aggSum id="0" enabled=true schema="metric" field="bytes" emptyAsNull=false',
        'aggSum id="1" enabled=true schema="metric" field="bytes" emptyAsNull=false',
        // group 2
        'aggFilteredMetric id="2" enabled=true schema="metric" \n  customBucket={aggFilter id="2-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"GA\\" "}} \n  customMetric={aggSum id="2-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}',
        'aggFilteredMetric id="3" enabled=true schema="metric" \n  customBucket={aggFilter id="3-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"GA\\" "}} \n  customMetric={aggSum id="3-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}',
        // group 3
        'aggFilteredMetric id="4" enabled=true schema="metric" \n  customBucket={aggFilter id="4-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"AL\\" "}} \n  customMetric={aggSum id="4-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}',
        'aggFilteredMetric id="5" enabled=true schema="metric" \n  customBucket={aggFilter id="5-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"AL\\" "}} \n  customMetric={aggSum id="5-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}',
        // group 4
        'aggFilteredMetric id="6" enabled=true schema="metric" \n  customBucket={aggFilter id="6-filter" enabled=true schema="bucket" filter={lucene q="\\"geo.dest: \\\\\\"AL\\\\\\" \\""}} \n  customMetric={aggSum id="6-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}',
        'aggFilteredMetric id="7" enabled=true schema="metric" \n  customBucket={aggFilter id="7-filter" enabled=true schema="bucket" filter={lucene q="\\"geo.dest: \\\\\\"AL\\\\\\" \\""}} \n  customMetric={aggSum id="7-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}',
        // group 5
        'aggFilteredMetric id="8" enabled=true schema="metric" \n  customBucket={aggFilter id="8-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"AL\\" "} timeWindow="1m"} \n  customMetric={aggSum id="8-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}',
        'aggFilteredMetric id="9" enabled=true schema="metric" \n  customBucket={aggFilter id="9-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"AL\\" "} timeWindow="1m"} \n  customMetric={aggSum id="9-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}',
      ].map((expression) => buildExpression(parseExpression(expression)));

      const { esAggsIdMap, aggsToIdsMap } = buildMapsFromAggBuilders(aggs);

      const { esAggsIdMap: newIdMap, aggs: newAggs } = sumOperation.optimizeEsAggs!(
        aggs,
        esAggsIdMap,
        aggsToIdsMap
      );

      expect(newAggs.length).toBe(5);

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

      expect(newAggs).toMatchSnapshot();
    });

    it("shouldn't touch unrelated aggs or aggs with no siblings", () => {
      const aggs = [
        makeEsAggBuilder('aggMedian', {
          id: 1,
          enabled: true,
          schema: 'metric',
          field: 'bar',
        }),
        makeEsAggBuilder('aggMedian', {
          id: 2,
          enabled: true,
          schema: 'metric',
          field: 'foo',
        }),
        makeEsAggBuilder('aggSinglePercentile', {
          id: 3,
          enabled: true,
          schema: 'metric',
          field: 'foo',
          percentile: 30,
        }),
      ];

      const { esAggsIdMap, aggsToIdsMap } = buildMapsFromAggBuilders(aggs);

      const { esAggsIdMap: newIdMap, aggs: newAggs } = medianOperation.optimizeEsAggs!(
        aggs,
        esAggsIdMap,
        aggsToIdsMap
      );

      expect(newAggs).toEqual(aggs);
      expect(newIdMap).toEqual(esAggsIdMap);
    });
  });
});

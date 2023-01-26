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
import { dedupeAggs } from './dedupe_aggs';
import { operationDefinitionMap } from './operations';
import { OriginalColumn } from './to_expression';

describe('dedupeAggs', () => {
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

  it('removes duplicate aggregations', () => {
    const aggs = [
      'aggSum id="0" enabled=true schema="metric" field="bytes" emptyAsNull=false',
      'aggSum id="1" enabled=true schema="metric" field="bytes" emptyAsNull=false',
      'aggFilteredMetric id="2" enabled=true schema="metric" \n  customBucket={aggFilter id="2-filter" enabled=true schema="bucket" filter={kql q="hour_of_day: *"}} \n  customMetric={aggTopMetrics id="2-metric" enabled=true schema="metric" field="hour_of_day" size=1 sortOrder="desc" sortField="timestamp"}',
      'aggFilteredMetric id="3" enabled=true schema="metric" \n  customBucket={aggFilter id="3-filter" enabled=true schema="bucket" filter={kql q="hour_of_day: *"}} \n  customMetric={aggTopMetrics id="3-metric" enabled=true schema="metric" field="hour_of_day" size=1 sortOrder="desc" sortField="timestamp"}',
      'aggAvg id="4" enabled=true schema="metric" field="bytes"',
      'aggAvg id="5" enabled=true schema="metric" field="bytes"',
    ].map((expression) => buildExpression(parseExpression(expression)));

    const { esAggsIdMap, aggsToIdsMap } = buildMapsFromAggBuilders(aggs);

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { sum, last_value, average } = operationDefinitionMap;

    const operations = [sum, last_value, average];

    operations.forEach((op) => expect(op.getGroupByKey).toBeDefined());

    const { esAggsIdMap: newIdMap, aggs: newAggs } = dedupeAggs(
      aggs,
      esAggsIdMap,
      aggsToIdsMap,
      operations
    );

    expect(newAggs).toHaveLength(3);

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
      }
    `);
  });

  it('should update any terms order-by reference', () => {
    const aggs = [
      'aggTerms id="0" enabled=true schema="segment" field="clientip" orderBy="3" order="desc" size=5 includeIsRegex=false excludeIsRegex=false otherBucket=true otherBucketLabel="Other" missingBucket=false missingBucketLabel="(missing value)"',
      'aggMedian id="1" enabled=true schema="metric" field="bytes"',
      'aggMedian id="2" enabled=true schema="metric" field="bytes"',
      'aggMedian id="3" enabled=true schema="metric" field="bytes"',
    ].map((expression) => buildExpression(parseExpression(expression)));

    const { esAggsIdMap, aggsToIdsMap } = buildMapsFromAggBuilders(aggs);

    const { aggs: newAggs } = dedupeAggs(aggs, esAggsIdMap, aggsToIdsMap, [
      operationDefinitionMap.median,
    ]);

    expect(newAggs).toHaveLength(2);

    expect(newAggs[0].functions[0].getArgument('orderBy')?.[0]).toBe('1');
  });
});

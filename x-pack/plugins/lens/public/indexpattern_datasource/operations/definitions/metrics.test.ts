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
} from '@kbn/expressions-plugin/common';
import { OriginalColumn } from '../../to_expression';
import { operationDefinitionMap } from '.';

const medianOperation = operationDefinitionMap.median;
const standardDeviationOperation = operationDefinitionMap.standard_deviation;

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

      expect(newAggs).toMatchSnapshot();

      expect(newIdMap).toMatchSnapshot();
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

    it('should preserve operation-specific agg config params', () => {
      const field = 'foo';

      const aggs = [
        makeEsAggBuilder('aggStdDeviation', {
          id: 1,
          enabled: true,
          schema: 'metric',
          field,
          timeShift: undefined,
          emptyAsNull: undefined,
        }),
        makeEsAggBuilder('aggStdDeviation', {
          id: 2,
          enabled: true,
          schema: 'metric',
          field,
          timeShift: undefined,
          emptyAsNull: undefined,
        }),
      ];

      const { esAggsIdMap, aggsToIdsMap } = buildMapsFromAggBuilders(aggs);

      const { aggs: newAggs } = standardDeviationOperation.optimizeEsAggs!(
        aggs,
        esAggsIdMap,
        aggsToIdsMap
      );

      expect(newAggs).toHaveLength(1);
      expect(newAggs[0].functions[0].getArgument('showBounds')?.[0]).toBe(false);
    });
  });
});

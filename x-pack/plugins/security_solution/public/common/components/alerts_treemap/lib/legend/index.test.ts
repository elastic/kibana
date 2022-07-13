/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash/fp';

import type { LegendItem } from '../../../charts/draggable_legend_item';
import { getRiskScorePalette, RISK_SCORE_STEPS } from '../chart_palette';
import { bucketsWithStackByField1, maxRiskSubAggregations } from '../flatten/mocks/mock_buckets';
import {
  getFirstGroupLegendItems,
  getLegendItemFromRawBucket,
  getLegendItemFromFlattenedBucket,
  getLegendMap,
} from '.';
import type { FlattenedBucket } from '../../types';

describe('legend', () => {
  const colorPalette = getRiskScorePalette(RISK_SCORE_STEPS);

  describe('getLegendItemFromRawBucket', () => {
    it('returns an undefined color when showColor is false', () => {
      expect(
        getLegendItemFromRawBucket({
          bucket: bucketsWithStackByField1[0],
          colorPalette,
          maxRiskSubAggregations,
          showColor: false,
          stackByField0: 'kibana.alert.rule.name',
        }).color
      ).toBeUndefined();
    });

    it('returns the expected color when showColor is true', () => {
      expect(
        getLegendItemFromRawBucket({
          bucket: bucketsWithStackByField1[0],
          colorPalette,
          maxRiskSubAggregations,
          showColor: true,
          stackByField0: 'kibana.alert.rule.name',
        }).color
      ).toEqual('#54b399');
    });

    it('returns the expected count', () => {
      expect(
        getLegendItemFromRawBucket({
          bucket: bucketsWithStackByField1[0],
          colorPalette,
          maxRiskSubAggregations,
          showColor: true,
          stackByField0: 'kibana.alert.rule.name',
        }).count
      ).toEqual(34);
    });

    it('returns the expected dataProviderId', () => {
      expect(
        getLegendItemFromRawBucket({
          bucket: bucketsWithStackByField1[0],
          colorPalette,
          maxRiskSubAggregations,
          showColor: true,
          stackByField0: 'kibana.alert.rule.name',
        }).dataProviderId
      ).toContain('draggable-legend-item-treemap-kibana_alert_rule_name-matches everything-');
    });

    it('returns the expected field', () => {
      expect(
        getLegendItemFromRawBucket({
          bucket: bucketsWithStackByField1[0],
          colorPalette,
          maxRiskSubAggregations,
          showColor: true,
          stackByField0: 'kibana.alert.rule.name',
        }).field
      ).toEqual('kibana.alert.rule.name');
    });

    it('returns the expected value', () => {
      expect(
        getLegendItemFromRawBucket({
          bucket: bucketsWithStackByField1[0],
          colorPalette,
          maxRiskSubAggregations,
          showColor: true,
          stackByField0: 'kibana.alert.rule.name',
        }).value
      ).toEqual('matches everything');
    });
  });

  describe('getLegendItemFromFlattenedBucket', () => {
    const flattenedBucket: FlattenedBucket = {
      doc_count: 34,
      key: 'matches everything',
      maxRiskSubAggregation: { value: 21 },
      stackByField1DocCount: 12,
      stackByField1Key: 'Host-k8iyfzraq9',
    };

    it('returns the expected legend item', () => {
      expect(
        omit(
          ['render', 'dataProviderId'],
          getLegendItemFromFlattenedBucket({
            colorPalette,
            flattenedBucket,
            maxRiskSubAggregations,
            stackByField0: 'kibana.alert.rule.name',
            stackByField1: 'host.name',
          })
        )
      ).toEqual({
        color: '#54b399',
        count: 12,
        field: 'host.name',
        value: 'Host-k8iyfzraq9',
      });
    });

    it('returns the expected render function', () => {
      const legendItem = getLegendItemFromFlattenedBucket({
        colorPalette,
        flattenedBucket,
        maxRiskSubAggregations,
        stackByField0: 'kibana.alert.rule.name',
        stackByField1: 'host.name',
      });

      expect(legendItem.render != null && legendItem.render()).toEqual('Host-k8iyfzraq9');
    });

    it('returns the expected dataProviderId', () => {
      const legendItem = getLegendItemFromFlattenedBucket({
        colorPalette,
        flattenedBucket,
        maxRiskSubAggregations,
        stackByField0: 'kibana.alert.rule.name',
        stackByField1: 'host.name',
      });

      expect(legendItem.dataProviderId).toContain(
        'draggable-legend-item-treemap-matches everything-Host-k8iyfzraq9-'
      );
    });
  });

  describe('getFirstGroupLegendItems', () => {
    it('returns the expected legend item', () => {
      expect(
        getFirstGroupLegendItems({
          buckets: bucketsWithStackByField1,
          colorPalette,
          maxRiskSubAggregations,
          stackByField0: 'kibana.alert.rule.name',
        }).map((x) => omit(['render', 'dataProviderId'], x))
      ).toEqual([
        {
          color: '#54b399',
          count: 34,
          field: 'kibana.alert.rule.name',
          value: 'matches everything',
        },
        {
          color: '#da8b45',
          count: 28,
          field: 'kibana.alert.rule.name',
          value: 'EQL process sequence',
        },
        {
          color: '#d6bf57',
          count: 19,
          field: 'kibana.alert.rule.name',
          value: 'Endpoint Security',
        },
        {
          color: '#e7664c',
          count: 5,
          field: 'kibana.alert.rule.name',
          value: 'mimikatz process started',
        },
        {
          color: '#e7664c',
          count: 1,
          field: 'kibana.alert.rule.name',
          value: 'Threshold rule',
        },
      ]);
    });

    it('returns the expected render function', () => {
      expect(
        getFirstGroupLegendItems({
          buckets: bucketsWithStackByField1,
          colorPalette,
          maxRiskSubAggregations,
          stackByField0: 'kibana.alert.rule.name',
        }).map((x) => (x.render != null ? x.render() : null))
      ).toEqual([
        'matches everything (Risk 21)',
        'EQL process sequence (Risk 73)',
        'Endpoint Security (Risk 47)',
        'mimikatz process started (Risk 99)',
        'Threshold rule (Risk 99)',
      ]);
    });
  });

  describe('getLegendMap', () => {
    it('returns the expected legend item', () => {
      const expected: Record<
        string,
        Array<Pick<LegendItem, 'color' | 'count' | 'field' | 'value'>>
      > = {
        'matches everything': [
          {
            color: undefined,
            count: 34,
            field: 'kibana.alert.rule.name',
            value: 'matches everything',
          },
        ],
        'EQL process sequence': [
          {
            color: undefined,
            count: 28,
            field: 'kibana.alert.rule.name',
            value: 'EQL process sequence',
          },
        ],
        'Endpoint Security': [
          {
            color: undefined,
            count: 19,
            field: 'kibana.alert.rule.name',
            value: 'Endpoint Security',
          },
        ],
        'mimikatz process started': [
          {
            color: undefined,
            count: 5,
            field: 'kibana.alert.rule.name',
            value: 'mimikatz process started',
          },
        ],
        'Threshold rule': [
          {
            color: undefined,
            count: 1,
            field: 'kibana.alert.rule.name',
            value: 'Threshold rule',
          },
        ],
      };

      const legendMap = getLegendMap({
        buckets: bucketsWithStackByField1,
        colorPalette,
        maxRiskSubAggregations,
        stackByField0: 'kibana.alert.rule.name',
      });

      Object.keys(expected).forEach((key) => {
        expect(omit(['render', 'dataProviderId'], legendMap[key][0])).toEqual(expected[key][0]);
      });
    });
  });
});

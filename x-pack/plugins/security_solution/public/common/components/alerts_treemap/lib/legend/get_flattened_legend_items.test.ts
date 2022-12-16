/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash/fp';

import type { LegendItem } from '../../../charts/draggable_legend_item';
import { getRiskScorePalette, RISK_SCORE_STEPS } from '../chart_palette';
import { getFlattenedLegendItems } from './get_flattened_legend_items';
import { bucketsWithStackByField1, maxRiskSubAggregations } from '../flatten/mocks/mock_buckets';
import { flattenedBuckets } from '../flatten/mocks/mock_flattened_buckets';

describe('getFlattenedLegendItems', () => {
  it('returns the expected legend items', () => {
    const expected: Array<Pick<LegendItem, 'color' | 'count' | 'field' | 'value'>> = [
      {
        count: 34,
        field: 'kibana.alert.rule.name',
        value: 'matches everything',
      },
      {
        color: '#54b399',
        count: 12,
        field: 'host.name',
        value: 'Host-k8iyfzraq9',
      },
      {
        color: '#54b399',
        count: 10,
        field: 'host.name',
        value: 'Host-ao1a4wu7vn',
      },
      {
        color: '#54b399',
        count: 7,
        field: 'host.name',
        value: 'Host-3fbljiq8rj',
      },
      {
        color: '#54b399',
        count: 5,
        field: 'host.name',
        value: 'Host-r4y6xi92ob',
      },
      {
        count: 28,
        field: 'kibana.alert.rule.name',
        value: 'EQL process sequence',
      },
      {
        color: '#da8b45',
        count: 10,
        field: 'host.name',
        value: 'Host-k8iyfzraq9',
      },
      {
        color: '#da8b45',
        count: 7,
        field: 'host.name',
        value: 'Host-ao1a4wu7vn',
      },
      {
        color: '#da8b45',
        count: 5,
        field: 'host.name',
        value: 'Host-3fbljiq8rj',
      },
      {
        color: '#da8b45',
        count: 3,
        field: 'host.name',
        value: 'Host-r4y6xi92ob',
      },
      {
        count: 19,
        field: 'kibana.alert.rule.name',
        value: 'Endpoint Security',
      },
      {
        color: '#d6bf57',
        count: 11,
        field: 'host.name',
        value: 'Host-ao1a4wu7vn',
      },
      {
        color: '#d6bf57',
        count: 6,
        field: 'host.name',
        value: 'Host-3fbljiq8rj',
      },
      {
        color: '#d6bf57',
        count: 1,
        field: 'host.name',
        value: 'Host-k8iyfzraq9',
      },
      {
        color: '#d6bf57',
        count: 1,
        field: 'host.name',
        value: 'Host-r4y6xi92ob',
      },
      {
        count: 5,
        field: 'kibana.alert.rule.name',
        value: 'mimikatz process started',
      },
      {
        color: '#e7664c',
        count: 3,
        field: 'host.name',
        value: 'Host-k8iyfzraq9',
      },
      {
        color: '#e7664c',
        count: 1,
        field: 'host.name',
        value: 'Host-3fbljiq8rj',
      },
      {
        color: '#e7664c',
        count: 1,
        field: 'host.name',
        value: 'Host-r4y6xi92ob',
      },
      {
        count: 1,
        field: 'kibana.alert.rule.name',
        value: 'Threshold rule',
      },
      {
        color: '#e7664c',
        count: 1,
        field: 'host.name',
        value: 'Host-r4y6xi92ob',
      },
    ];

    const legendItems = getFlattenedLegendItems({
      buckets: bucketsWithStackByField1,
      colorPalette: getRiskScorePalette(RISK_SCORE_STEPS),
      flattenedBuckets,
      maxRiskSubAggregations,
      stackByField0: 'kibana.alert.rule.name',
      stackByField1: 'host.name',
    });

    expect(legendItems.map((x) => omit(['render', 'dataProviderId'], x))).toEqual(expected);
  });
});

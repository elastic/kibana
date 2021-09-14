/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnomalyRecordDoc } from '../types/anomalies';

import {
  aggregationTypeTransform,
  getEntityFieldList,
  getEntityFieldName,
  getEntityFieldValue,
  getMultiBucketImpactLabel,
  getSeverity,
  getSeverityWithLow,
  getSeverityColor,
  isRuleSupported,
  showActualForFunction,
  showTypicalForFunction,
} from './anomaly_utils';

describe('ML - anomaly utils', () => {
  const partitionEntityRecord: AnomalyRecordDoc = {
    job_id: 'farequote',
    result_type: 'record',
    probability: 0.012818,
    record_score: 0.0162059,
    initial_record_score: 0.0162059,
    bucket_span: 300,
    detector_index: 0,
    is_interim: false,
    timestamp: 1455047400000,
    partition_field_name: 'airline',
    partition_field_value: 'AAL',
    function: 'mean',
    function_description: 'mean',
    field_name: 'responsetime',
  };

  const byEntityRecord: AnomalyRecordDoc = {
    job_id: 'farequote',
    result_type: 'record',
    probability: 0.012818,
    record_score: 0.0162059,
    initial_record_score: 0.0162059,
    bucket_span: 300,
    detector_index: 0,
    is_interim: false,
    timestamp: 1455047400000,
    by_field_name: 'airline',
    by_field_value: 'JZA',
    function: 'mean',
    function_description: 'mean',
    field_name: 'responsetime',
  };

  const overEntityRecord: AnomalyRecordDoc = {
    job_id: 'gallery',
    result_type: 'record',
    probability: 2.81806e-9,
    record_score: 59.055,
    initial_record_score: 59.055,
    bucket_span: 3600,
    detector_index: 4,
    is_interim: false,
    timestamp: 1420552800000,
    function: 'sum',
    function_description: 'sum',
    field_name: 'bytes',
    by_field_name: 'method',
    over_field_name: 'clientip',
    over_field_value: '37.157.32.164',
  };

  const noEntityRecord: AnomalyRecordDoc = {
    job_id: 'farequote_no_by',
    result_type: 'record',
    probability: 0.0191711,
    record_score: 4.38431,
    initial_record_score: 19.654,
    bucket_span: 300,
    detector_index: 0,
    is_interim: false,
    timestamp: 1454890500000,
    function: 'mean',
    function_description: 'mean',
    field_name: 'responsetime',
  };

  const metricNoEntityRecord: AnomalyRecordDoc = {
    job_id: 'farequote_metric',
    result_type: 'record',
    probability: 0.030133495093182184,
    record_score: 0.024881740359975164,
    initial_record_score: 0.024881740359975164,
    bucket_span: 900,
    detector_index: 0,
    is_interim: false,
    timestamp: 1486845000000,
    function: 'metric',
    function_description: 'mean',
    typical: [545.7764658569108],
    actual: [758.8220213274412],
    field_name: 'responsetime',
    influencers: [
      {
        influencer_field_name: 'airline',
        influencer_field_values: ['NKS'],
      },
    ],
    airline: ['NKS'],
  };

  const rareEntityRecord: AnomalyRecordDoc = {
    job_id: 'gallery',
    result_type: 'record',
    probability: 0.02277014211908481,
    record_score: 4.545378107075983,
    initial_record_score: 4.545378107075983,
    bucket_span: 3600,
    detector_index: 0,
    is_interim: false,
    timestamp: 1495879200000,
    by_field_name: 'status',
    function: 'rare',
    function_description: 'rare',
    over_field_name: 'clientip',
    over_field_value: '173.252.74.112',
    causes: [
      {
        probability: 0.02277014211908481,
        by_field_name: 'status',
        by_field_value: '206',
        function: 'rare',
        function_description: 'rare',
        typical: [0.00014832458182211878],
        actual: [1],
        over_field_name: 'clientip',
        over_field_value: '173.252.74.112',
      },
    ],
    influencers: [
      {
        influencer_field_name: 'uri',
        influencer_field_values: [
          '/wp-content/uploads/2013/06/dune_house_oil_on_canvas_24x20-298x298.jpg',
          '/wp-content/uploads/2013/10/Case-dAste-1-11-298x298.png',
        ],
      },
      {
        influencer_field_name: 'status',
        influencer_field_values: ['206'],
      },
      {
        influencer_field_name: 'clientip',
        influencer_field_values: ['173.252.74.112'],
      },
    ],
    clientip: ['173.252.74.112'],
    uri: [
      '/wp-content/uploads/2013/06/dune_house_oil_on_canvas_24x20-298x298.jpg',
      '/wp-content/uploads/2013/10/Case-dAste-1-11-298x298.png',
    ],
    status: ['206'],
  };

  describe('getSeverity', () => {
    test('returns warning for 0 <= score < 25', () => {
      expect(getSeverity(0).id).toBe('warning');
      expect(getSeverity(0.001).id).toBe('warning');
      expect(getSeverity(24.99).id).toBe('warning');
    });

    test('returns minor for 25 <= score < 50', () => {
      expect(getSeverity(25).id).toBe('minor');
      expect(getSeverity(49.99).id).toBe('minor');
    });

    test('returns minor for 50 <= score < 75', () => {
      expect(getSeverity(50).id).toBe('major');
      expect(getSeverity(74.99).id).toBe('major');
    });

    test('returns critical for score >= 75', () => {
      expect(getSeverity(75).id).toBe('critical');
      expect(getSeverity(100).id).toBe('critical');
      expect(getSeverity(1000).id).toBe('critical');
    });

    test('returns unknown for scores less than 0', () => {
      expect(getSeverity(-10).id).toBe('unknown');
    });
  });

  describe('getSeverityWithLow', () => {
    test('returns low for 0 <= score < 3', () => {
      expect(getSeverityWithLow(0).id).toBe('low');
      expect(getSeverityWithLow(0.001).id).toBe('low');
      expect(getSeverityWithLow(2.99).id).toBe('low');
    });

    test('returns warning for 3 <= score < 25', () => {
      expect(getSeverityWithLow(3).id).toBe('warning');
      expect(getSeverityWithLow(24.99).id).toBe('warning');
    });

    test('returns minor for 25 <= score < 50', () => {
      expect(getSeverityWithLow(25).id).toBe('minor');
      expect(getSeverityWithLow(49.99).id).toBe('minor');
    });

    test('returns minor for 50 <= score < 75', () => {
      expect(getSeverityWithLow(50).id).toBe('major');
      expect(getSeverityWithLow(74.99).id).toBe('major');
    });

    test('returns critical for score >= 75', () => {
      expect(getSeverityWithLow(75).id).toBe('critical');
      expect(getSeverityWithLow(100).id).toBe('critical');
      expect(getSeverityWithLow(1000).id).toBe('critical');
    });

    test('returns unknown for scores less than 0 ', () => {
      expect(getSeverityWithLow(-10).id).toBe('unknown');
    });
  });

  describe('getSeverityColor', () => {
    test('returns correct hex code for low for 0 <= score < 3', () => {
      expect(getSeverityColor(0)).toBe('#d2e9f7');
      expect(getSeverityColor(0.001)).toBe('#d2e9f7');
      expect(getSeverityColor(2.99)).toBe('#d2e9f7');
    });

    test('returns correct hex code for warning for 3 <= score < 25', () => {
      expect(getSeverityColor(3)).toBe('#8bc8fb');
      expect(getSeverityColor(24.99)).toBe('#8bc8fb');
    });

    test('returns correct hex code for minor for 25 <= score < 50', () => {
      expect(getSeverityColor(25)).toBe('#fdec25');
      expect(getSeverityColor(49.99)).toBe('#fdec25');
    });

    test('returns correct hex code for major for 50 <= score < 75', () => {
      expect(getSeverityColor(50)).toBe('#fba740');
      expect(getSeverityColor(74.99)).toBe('#fba740');
    });

    test('returns correct hex code for critical for score >= 75', () => {
      expect(getSeverityColor(75)).toBe('#fe5050');
      expect(getSeverityColor(100)).toBe('#fe5050');
      expect(getSeverityColor(1000)).toBe('#fe5050');
    });

    test('returns correct hex code for unknown for scores less than 0', () => {
      expect(getSeverityColor(-10)).toBe('#ffffff');
    });
  });

  describe('getMultiBucketImpactLabel', () => {
    test('returns high for 3 <= score <= 5', () => {
      expect(getMultiBucketImpactLabel(3)).toBe('high');
      expect(getMultiBucketImpactLabel(5)).toBe('high');
    });

    test('returns medium for 2 <= score < 3', () => {
      expect(getMultiBucketImpactLabel(2)).toBe('medium');
      expect(getMultiBucketImpactLabel(2.99)).toBe('medium');
    });

    test('returns low for 1 <= score < 2', () => {
      expect(getMultiBucketImpactLabel(1)).toBe('low');
      expect(getMultiBucketImpactLabel(1.99)).toBe('low');
    });

    test('returns none for -5 <= score < 1', () => {
      expect(getMultiBucketImpactLabel(-5)).toBe('none');
      expect(getMultiBucketImpactLabel(0.99)).toBe('none');
    });

    test('returns expected label when impact outside normal bounds', () => {
      expect(getMultiBucketImpactLabel(10)).toBe('high');
      expect(getMultiBucketImpactLabel(-10)).toBe('none');
    });
  });

  describe('getEntityFieldName', () => {
    it('returns the by field name', () => {
      expect(getEntityFieldName(byEntityRecord)).toBe('airline');
    });

    it('returns the partition field name', () => {
      expect(getEntityFieldName(partitionEntityRecord)).toBe('airline');
    });

    it('returns the over field name', () => {
      expect(getEntityFieldName(overEntityRecord)).toBe('clientip');
    });

    it('returns undefined if no by, over or partition fields', () => {
      expect(getEntityFieldName(noEntityRecord)).toBe(undefined);
    });
  });

  describe('getEntityFieldValue', () => {
    test('returns the by field value', () => {
      expect(getEntityFieldValue(byEntityRecord)).toBe('JZA');
    });

    test('returns the partition field value', () => {
      expect(getEntityFieldValue(partitionEntityRecord)).toBe('AAL');
    });

    test('returns the over field value', () => {
      expect(getEntityFieldValue(overEntityRecord)).toBe('37.157.32.164');
    });

    test('returns undefined if no by, over or partition fields', () => {
      expect(getEntityFieldValue(noEntityRecord)).toBe(undefined);
    });
  });

  describe('getEntityFieldList', () => {
    test('returns an empty list for a record with no by, over or partition fields', () => {
      expect(getEntityFieldList(noEntityRecord)).toHaveLength(0);
    });

    test('returns correct list for a record with a by field', () => {
      expect(getEntityFieldList(byEntityRecord)).toEqual([
        {
          fieldName: 'airline',
          fieldValue: 'JZA',
          fieldType: 'by',
        },
      ]);
    });

    test('returns correct list for a record with a partition field', () => {
      expect(getEntityFieldList(partitionEntityRecord)).toEqual([
        {
          fieldName: 'airline',
          fieldValue: 'AAL',
          fieldType: 'partition',
        },
      ]);
    });

    test('returns correct list for a record with an over field', () => {
      expect(getEntityFieldList(overEntityRecord)).toEqual([
        {
          fieldName: 'clientip',
          fieldValue: '37.157.32.164',
          fieldType: 'over',
        },
      ]);
    });

    test('returns correct list for a record with a by and over field', () => {
      expect(getEntityFieldList(rareEntityRecord)).toEqual([
        {
          fieldName: 'clientip',
          fieldValue: '173.252.74.112',
          fieldType: 'over',
        },
      ]);
    });
  });

  describe('showActualForFunction', () => {
    test('returns true for expected function descriptions', () => {
      expect(showActualForFunction('count')).toBe(true);
      expect(showActualForFunction('distinct_count')).toBe(true);
      expect(showActualForFunction('lat_long')).toBe(true);
      expect(showActualForFunction('mean')).toBe(true);
      expect(showActualForFunction('max')).toBe(true);
      expect(showActualForFunction('min')).toBe(true);
      expect(showActualForFunction('sum')).toBe(true);
      expect(showActualForFunction('median')).toBe(true);
      expect(showActualForFunction('varp')).toBe(true);
      expect(showActualForFunction('info_content')).toBe(true);
      expect(showActualForFunction('time')).toBe(true);
    });

    test('returns false for expected function descriptions', () => {
      expect(showActualForFunction('rare')).toBe(false);
    });
  });

  describe('showTypicalForFunction', () => {
    test('returns true for expected function descriptions', () => {
      expect(showTypicalForFunction('count')).toBe(true);
      expect(showTypicalForFunction('distinct_count')).toBe(true);
      expect(showTypicalForFunction('lat_long')).toBe(true);
      expect(showTypicalForFunction('mean')).toBe(true);
      expect(showTypicalForFunction('max')).toBe(true);
      expect(showTypicalForFunction('min')).toBe(true);
      expect(showTypicalForFunction('sum')).toBe(true);
      expect(showTypicalForFunction('median')).toBe(true);
      expect(showTypicalForFunction('varp')).toBe(true);
      expect(showTypicalForFunction('info_content')).toBe(true);
      expect(showTypicalForFunction('time')).toBe(true);
    });

    test('returns false for expected function descriptions', () => {
      expect(showTypicalForFunction('rare')).toBe(false);
    });
  });

  describe('isRuleSupported', () => {
    test('returns true for anomalies supporting rules', () => {
      expect(isRuleSupported(partitionEntityRecord)).toBe(true);
      expect(isRuleSupported(byEntityRecord)).toBe(true);
      expect(isRuleSupported(overEntityRecord)).toBe(true);
      expect(isRuleSupported(rareEntityRecord)).toBe(true);
      expect(isRuleSupported(noEntityRecord)).toBe(true);
    });

    it('returns false for anomaly not supporting rules', () => {
      expect(isRuleSupported(metricNoEntityRecord)).toBe(false);
    });
  });

  describe('aggregationTypeTransform', () => {
    test('returns correct ES aggregation type for ML function description', () => {
      expect(aggregationTypeTransform.toES('count')).toBe('count');
      expect(aggregationTypeTransform.toES('distinct_count')).toBe('cardinality');
      expect(aggregationTypeTransform.toES('mean')).toBe('avg');
      expect(aggregationTypeTransform.toES('max')).toBe('max');
      expect(aggregationTypeTransform.toES('min')).toBe('min');
      expect(aggregationTypeTransform.toES('sum')).toBe('sum');
    });

    test('returns correct ML function description for ES aggregation type', () => {
      expect(aggregationTypeTransform.toML('count')).toBe('count');
      expect(aggregationTypeTransform.toML('cardinality')).toBe('distinct_count');
      expect(aggregationTypeTransform.toML('avg')).toBe('mean');
      expect(aggregationTypeTransform.toML('max')).toBe('max');
      expect(aggregationTypeTransform.toML('min')).toBe('min');
      expect(aggregationTypeTransform.toML('sum')).toBe('sum');
    });
  });
});

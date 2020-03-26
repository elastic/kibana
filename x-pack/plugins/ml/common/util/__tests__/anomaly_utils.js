/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import {
  getSeverity,
  getSeverityWithLow,
  getSeverityColor,
  getMultiBucketImpactLabel,
  getEntityFieldName,
  getEntityFieldValue,
  getEntityFieldList,
  showActualForFunction,
  showTypicalForFunction,
  isRuleSupported,
  aggregationTypeTransform,
} from '../anomaly_utils';

describe('ML - anomaly utils', () => {
  const partitionEntityRecord = {
    job_id: 'farequote',
    result_type: 'record',
    probability: 0.012818,
    record_score: 0.0162059,
    bucket_span: 300,
    detector_index: 0,
    timestamp: 1455047400000,
    partition_field_name: 'airline',
    partition_field_value: 'AAL',
    function: 'mean',
    function_description: 'mean',
    field_name: 'responsetime',
  };

  const byEntityRecord = {
    job_id: 'farequote',
    result_type: 'record',
    probability: 0.012818,
    record_score: 0.0162059,
    bucket_span: 300,
    detector_index: 0,
    timestamp: 1455047400000,
    by_field_name: 'airline',
    by_field_value: 'JZA',
    function: 'mean',
    function_description: 'mean',
    field_name: 'responsetime',
  };

  const overEntityRecord = {
    job_id: 'gallery',
    result_type: 'record',
    probability: 2.81806e-9,
    record_score: 59.055,
    bucket_span: 3600,
    detector_index: 4,
    timestamp: 1420552800000,
    function: 'sum',
    function_description: 'sum',
    field_name: 'bytes',
    by_field_name: 'method',
    over_field_name: 'clientip',
    over_field_value: '37.157.32.164',
  };

  const noEntityRecord = {
    job_id: 'farequote_no_by',
    result_type: 'record',
    probability: 0.0191711,
    record_score: 4.38431,
    initial_record_score: 19.654,
    bucket_span: 300,
    detector_index: 0,
    timestamp: 1454890500000,
    function: 'mean',
    function_description: 'mean',
    field_name: 'responsetime',
  };

  const metricNoEntityRecord = {
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

  const rareEntityRecord = {
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
    it('returns warning for 0 <= score < 25', () => {
      expect(getSeverity(0).id).to.be('warning');
      expect(getSeverity(0.001).id).to.be('warning');
      expect(getSeverity(24.99).id).to.be('warning');
    });

    it('returns minor for 25 <= score < 50', () => {
      expect(getSeverity(25).id).to.be('minor');
      expect(getSeverity(49.99).id).to.be('minor');
    });

    it('returns minor for 50 <= score < 75', () => {
      expect(getSeverity(50).id).to.be('major');
      expect(getSeverity(74.99).id).to.be('major');
    });

    it('returns critical for score >= 75', () => {
      expect(getSeverity(75).id).to.be('critical');
      expect(getSeverity(100).id).to.be('critical');
      expect(getSeverity(1000).id).to.be('critical');
    });

    it('returns unknown for scores less than 0 or string input', () => {
      expect(getSeverity(-10).id).to.be('unknown');
      expect(getSeverity('value').id).to.be('unknown');
    });
  });

  describe('getSeverityWithLow', () => {
    it('returns low for 0 <= score < 3', () => {
      expect(getSeverityWithLow(0).id).to.be('low');
      expect(getSeverityWithLow(0.001).id).to.be('low');
      expect(getSeverityWithLow(2.99).id).to.be('low');
    });

    it('returns warning for 3 <= score < 25', () => {
      expect(getSeverityWithLow(3).id).to.be('warning');
      expect(getSeverityWithLow(24.99).id).to.be('warning');
    });

    it('returns minor for 25 <= score < 50', () => {
      expect(getSeverityWithLow(25).id).to.be('minor');
      expect(getSeverityWithLow(49.99).id).to.be('minor');
    });

    it('returns minor for 50 <= score < 75', () => {
      expect(getSeverityWithLow(50).id).to.be('major');
      expect(getSeverityWithLow(74.99).id).to.be('major');
    });

    it('returns critical for score >= 75', () => {
      expect(getSeverityWithLow(75).id).to.be('critical');
      expect(getSeverityWithLow(100).id).to.be('critical');
      expect(getSeverityWithLow(1000).id).to.be('critical');
    });

    it('returns unknown for scores less than 0 or string input', () => {
      expect(getSeverityWithLow(-10).id).to.be('unknown');
      expect(getSeverityWithLow('value').id).to.be('unknown');
    });
  });

  describe('getSeverityColor', () => {
    it('returns correct hex code for low for 0 <= score < 3', () => {
      expect(getSeverityColor(0)).to.be('#d2e9f7');
      expect(getSeverityColor(0.001)).to.be('#d2e9f7');
      expect(getSeverityColor(2.99)).to.be('#d2e9f7');
    });

    it('returns correct hex code for warning for 3 <= score < 25', () => {
      expect(getSeverityColor(3)).to.be('#8bc8fb');
      expect(getSeverityColor(24.99)).to.be('#8bc8fb');
    });

    it('returns correct hex code for minor for 25 <= score < 50', () => {
      expect(getSeverityColor(25)).to.be('#fdec25');
      expect(getSeverityColor(49.99)).to.be('#fdec25');
    });

    it('returns correct hex code for major for 50 <= score < 75', () => {
      expect(getSeverityColor(50)).to.be('#fba740');
      expect(getSeverityColor(74.99)).to.be('#fba740');
    });

    it('returns correct hex code for critical for score >= 75', () => {
      expect(getSeverityColor(75)).to.be('#fe5050');
      expect(getSeverityColor(100)).to.be('#fe5050');
      expect(getSeverityColor(1000)).to.be('#fe5050');
    });

    it('returns correct hex code for unknown for scores less than 0 or string input', () => {
      expect(getSeverityColor(-10)).to.be('#ffffff');
      expect(getSeverityColor('value')).to.be('#ffffff');
    });
  });

  describe('getMultiBucketImpactLabel', () => {
    it('returns high for 3 <= score <= 5', () => {
      expect(getMultiBucketImpactLabel(3)).to.be('high');
      expect(getMultiBucketImpactLabel(5)).to.be('high');
    });

    it('returns medium for 2 <= score < 3', () => {
      expect(getMultiBucketImpactLabel(2)).to.be('medium');
      expect(getMultiBucketImpactLabel(2.99)).to.be('medium');
    });

    it('returns low for 1 <= score < 2', () => {
      expect(getMultiBucketImpactLabel(1)).to.be('low');
      expect(getMultiBucketImpactLabel(1.99)).to.be('low');
    });

    it('returns none for -5 <= score < 1', () => {
      expect(getMultiBucketImpactLabel(-5)).to.be('none');
      expect(getMultiBucketImpactLabel(0.99)).to.be('none');
    });

    it('returns expected label when impact outside normal bounds', () => {
      expect(getMultiBucketImpactLabel(10)).to.be('high');
      expect(getMultiBucketImpactLabel(-10)).to.be('none');
    });
  });

  describe('getEntityFieldName', () => {
    it('returns the by field name', () => {
      expect(getEntityFieldName(byEntityRecord)).to.be('airline');
    });

    it('returns the partition field name', () => {
      expect(getEntityFieldName(partitionEntityRecord)).to.be('airline');
    });

    it('returns the over field name', () => {
      expect(getEntityFieldName(overEntityRecord)).to.be('clientip');
    });

    it('returns undefined if no by, over or partition fields', () => {
      expect(getEntityFieldName(noEntityRecord)).to.be(undefined);
    });
  });

  describe('getEntityFieldValue', () => {
    it('returns the by field value', () => {
      expect(getEntityFieldValue(byEntityRecord)).to.be('JZA');
    });

    it('returns the partition field value', () => {
      expect(getEntityFieldValue(partitionEntityRecord)).to.be('AAL');
    });

    it('returns the over field value', () => {
      expect(getEntityFieldValue(overEntityRecord)).to.be('37.157.32.164');
    });

    it('returns undefined if no by, over or partition fields', () => {
      expect(getEntityFieldValue(noEntityRecord)).to.be(undefined);
    });
  });

  describe('getEntityFieldList', () => {
    it('returns an empty list for a record with no by, over or partition fields', () => {
      expect(getEntityFieldList(noEntityRecord)).to.be.empty();
    });

    it('returns correct list for a record with a by field', () => {
      expect(getEntityFieldList(byEntityRecord)).to.eql([
        {
          fieldName: 'airline',
          fieldValue: 'JZA',
          fieldType: 'by',
        },
      ]);
    });

    it('returns correct list for a record with a partition field', () => {
      expect(getEntityFieldList(partitionEntityRecord)).to.eql([
        {
          fieldName: 'airline',
          fieldValue: 'AAL',
          fieldType: 'partition',
        },
      ]);
    });

    it('returns correct list for a record with an over field', () => {
      expect(getEntityFieldList(overEntityRecord)).to.eql([
        {
          fieldName: 'clientip',
          fieldValue: '37.157.32.164',
          fieldType: 'over',
        },
      ]);
    });

    it('returns correct list for a record with a by and over field', () => {
      expect(getEntityFieldList(rareEntityRecord)).to.eql([
        {
          fieldName: 'clientip',
          fieldValue: '173.252.74.112',
          fieldType: 'over',
        },
      ]);
    });
  });

  describe('showActualForFunction', () => {
    it('returns true for expected function descriptions', () => {
      expect(showActualForFunction('count')).to.be(true);
      expect(showActualForFunction('distinct_count')).to.be(true);
      expect(showActualForFunction('lat_long')).to.be(true);
      expect(showActualForFunction('mean')).to.be(true);
      expect(showActualForFunction('max')).to.be(true);
      expect(showActualForFunction('min')).to.be(true);
      expect(showActualForFunction('sum')).to.be(true);
      expect(showActualForFunction('median')).to.be(true);
      expect(showActualForFunction('varp')).to.be(true);
      expect(showActualForFunction('info_content')).to.be(true);
      expect(showActualForFunction('time')).to.be(true);
    });

    it('returns false for expected function descriptions', () => {
      expect(showActualForFunction('rare')).to.be(false);
    });
  });

  describe('showTypicalForFunction', () => {
    it('returns true for expected function descriptions', () => {
      expect(showTypicalForFunction('count')).to.be(true);
      expect(showTypicalForFunction('distinct_count')).to.be(true);
      expect(showTypicalForFunction('lat_long')).to.be(true);
      expect(showTypicalForFunction('mean')).to.be(true);
      expect(showTypicalForFunction('max')).to.be(true);
      expect(showTypicalForFunction('min')).to.be(true);
      expect(showTypicalForFunction('sum')).to.be(true);
      expect(showTypicalForFunction('median')).to.be(true);
      expect(showTypicalForFunction('varp')).to.be(true);
      expect(showTypicalForFunction('info_content')).to.be(true);
      expect(showTypicalForFunction('time')).to.be(true);
    });

    it('returns false for expected function descriptions', () => {
      expect(showTypicalForFunction('rare')).to.be(false);
    });
  });

  describe('isRuleSupported', () => {
    it('returns true for anomalies supporting rules', () => {
      expect(isRuleSupported(partitionEntityRecord)).to.be(true);
      expect(isRuleSupported(byEntityRecord)).to.be(true);
      expect(isRuleSupported(overEntityRecord)).to.be(true);
      expect(isRuleSupported(rareEntityRecord)).to.be(true);
      expect(isRuleSupported(noEntityRecord)).to.be(true);
    });

    it('returns false for anomaly not supporting rules', () => {
      expect(isRuleSupported(metricNoEntityRecord)).to.be(false);
    });
  });

  describe('aggregationTypeTransform', () => {
    it('returns correct ES aggregation type for ML function description', () => {
      expect(aggregationTypeTransform.toES('count')).to.be('count');
      expect(aggregationTypeTransform.toES('distinct_count')).to.be('cardinality');
      expect(aggregationTypeTransform.toES('distinct_count')).to.not.be('distinct_count');
      expect(aggregationTypeTransform.toES('mean')).to.be('avg');
      expect(aggregationTypeTransform.toES('mean')).to.not.be('mean');
      expect(aggregationTypeTransform.toES('max')).to.be('max');
      expect(aggregationTypeTransform.toES('min')).to.be('min');
      expect(aggregationTypeTransform.toES('sum')).to.be('sum');
    });

    it('returns correct ML function description for ES aggregation type', () => {
      expect(aggregationTypeTransform.toML('count')).to.be('count');
      expect(aggregationTypeTransform.toML('cardinality')).to.be('distinct_count');
      expect(aggregationTypeTransform.toML('cardinality')).to.not.be('cardinality');
      expect(aggregationTypeTransform.toML('avg')).to.be('mean');
      expect(aggregationTypeTransform.toML('avg')).to.not.be('avg');
      expect(aggregationTypeTransform.toML('max')).to.be('max');
      expect(aggregationTypeTransform.toML('min')).to.be('min');
      expect(aggregationTypeTransform.toML('sum')).to.be('sum');
    });
  });
});

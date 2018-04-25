/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import expect from 'expect.js';
import {
  getSeverity,
  getSeverityWithLow,
  getSeverityColor,
  labelDuplicateDetectorDescriptions,
  getEntityFieldName,
  getEntityFieldValue,
  showActualForFunction,
  showTypicalForFunction,
  aggregationTypeTransform
} from '../anomaly_utils';

describe('ML - anomaly utils', () => {

  const partitionEntityRecord = {
    'job_id': 'farequote',
    'result_type': 'record',
    'probability': 0.012818,
    'record_score': 0.0162059,
    'bucket_span': 300,
    'detector_index': 0,
    'timestamp': 1455047400000,
    'partition_field_name': 'airline',
    'partition_field_value': 'AAL',
    'function': 'mean',
    'function_description': 'mean',
    'field_name': 'responsetime'
  };

  const byEntityRecord = {
    'job_id': 'farequote',
    'result_type': 'record',
    'probability': 0.012818,
    'record_score': 0.0162059,
    'bucket_span': 300,
    'detector_index': 0,
    'timestamp': 1455047400000,
    'by_field_name': 'airline',
    'by_field_value': 'JZA',
    'function': 'mean',
    'function_description': 'mean',
    'field_name': 'responsetime'
  };

  const overEntityRecord = {
    'job_id': 'gallery',
    'result_type': 'record',
    'probability': 2.81806e-9,
    'record_score': 59.055,
    'bucket_span': 3600,
    'detector_index': 4,
    'timestamp': 1420552800000,
    'function': 'sum',
    'function_description': 'sum',
    'field_name': 'bytes',
    'by_field_name': 'method',
    'over_field_name': 'clientip',
    'over_field_value': '37.157.32.164'
  };

  const noEntityRecord = {
    'job_id': 'farequote_no_by',
    'result_type': 'record',
    'probability': 0.0191711,
    'record_score': 4.38431,
    'initial_record_score': 19.654,
    'bucket_span': 300,
    'detector_index': 0,
    'timestamp': 1454890500000,
    'function': 'mean',
    'function_description': 'mean',
    'field_name': 'responsetime'
  };

  describe('getSeverity', () => {

    it('returns warning for 0 <= score < 25', () => {
      expect(getSeverity(0)).to.be('warning');
      expect(getSeverity(0.001)).to.be('warning');
      expect(getSeverity(24.99)).to.be('warning');
    });

    it('returns minor for 25 <= score < 50', () => {
      expect(getSeverity(25)).to.be('minor');
      expect(getSeverity(49.99)).to.be('minor');
    });

    it('returns minor for 50 <= score < 75', () => {
      expect(getSeverity(50)).to.be('major');
      expect(getSeverity(74.99)).to.be('major');
    });

    it('returns critical for score >= 75', () => {
      expect(getSeverity(75)).to.be('critical');
      expect(getSeverity(100)).to.be('critical');
      expect(getSeverity(1000)).to.be('critical');
    });

    it('returns unknown for scores less than 0 or string input', () => {
      expect(getSeverity(-10)).to.be('unknown');
      expect(getSeverity('value')).to.be('unknown');
    });

  });

  describe('getSeverityWithLow', () => {

    it('returns low for 0 <= score < 3', () => {
      expect(getSeverityWithLow(0)).to.be('low');
      expect(getSeverityWithLow(0.001)).to.be('low');
      expect(getSeverityWithLow(2.99)).to.be('low');
    });

    it('returns warning for 3 <= score < 25', () => {
      expect(getSeverityWithLow(3)).to.be('warning');
      expect(getSeverityWithLow(24.99)).to.be('warning');
    });

    it('returns minor for 25 <= score < 50', () => {
      expect(getSeverityWithLow(25)).to.be('minor');
      expect(getSeverityWithLow(49.99)).to.be('minor');
    });

    it('returns minor for 50 <= score < 75', () => {
      expect(getSeverityWithLow(50)).to.be('major');
      expect(getSeverityWithLow(74.99)).to.be('major');
    });

    it('returns critical for score >= 75', () => {
      expect(getSeverityWithLow(75)).to.be('critical');
      expect(getSeverityWithLow(100)).to.be('critical');
      expect(getSeverityWithLow(1000)).to.be('critical');
    });

    it('returns unknown for scores less than 0 or string input', () => {
      expect(getSeverityWithLow(-10)).to.be('unknown');
      expect(getSeverityWithLow('value')).to.be('unknown');
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

  describe('labelDuplicateDetectorDescriptions', () => {
    const detectorsByJob = {
      'job1': ['detector1', 'detector2'],
      'job2': ['detector1', 'detector3']
    };
    const result = labelDuplicateDetectorDescriptions(detectorsByJob);

    it('appends the job ID for detectors with identical descriptions to those in other jobs', () => {
      expect(result.job1[0]).to.be('detector1 (job1)');
      expect(result.job2[0]).to.be('detector1 (job2)');
    });

    it('leaves description unchanged for detectors with different descriptions to those in other jobs', () => {
      expect(result.job1[1]).to.be('detector2');
      expect(result.job2[1]).to.be('detector3');
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
      expect(showTypicalForFunction('lat_long')).to.be(false);
      expect(showTypicalForFunction('rare')).to.be(false);
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

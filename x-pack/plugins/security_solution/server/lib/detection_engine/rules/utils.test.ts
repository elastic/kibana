/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { calculateInterval, calculateVersion, calculateName } from './utils';

describe('utils', () => {
  describe('#calculateInterval', () => {
    test('given a undefined interval, it returns the ruleInterval ', () => {
      const interval = calculateInterval(undefined, '10m');
      expect(interval).toEqual('10m');
    });

    test('given a undefined ruleInterval, it returns a undefined interval ', () => {
      const interval = calculateInterval('10m', undefined);
      expect(interval).toEqual('10m');
    });

    test('given both an undefined ruleInterval and a undefined interval, it returns 5m', () => {
      const interval = calculateInterval(undefined, undefined);
      expect(interval).toEqual('5m');
    });
  });

  describe('#calculateVersion', () => {
    test('returning the same version number if given an immutable but no updated version number', () => {
      expect(
        calculateVersion(true, 1, {
          author: [],
          buildingBlockType: undefined,
          description: 'some description change',
          falsePositives: undefined,
          query: undefined,
          language: undefined,
          license: undefined,
          outputIndex: undefined,
          savedId: undefined,
          timelineId: undefined,
          timelineTitle: undefined,
          meta: undefined,
          filters: [],
          from: undefined,
          index: undefined,
          interval: undefined,
          maxSignals: undefined,
          riskScore: undefined,
          riskScoreMapping: undefined,
          ruleNameOverride: undefined,
          name: undefined,
          severity: undefined,
          severityMapping: undefined,
          tags: undefined,
          threat: undefined,
          to: undefined,
          timestampOverride: undefined,
          type: undefined,
          references: undefined,
          version: undefined,
          note: undefined,
          anomalyThreshold: undefined,
          machineLearningJobId: undefined,
          exceptionsList: [],
        })
      ).toEqual(1);
    });

    test('returning an updated version number if given an immutable and an updated version number', () => {
      expect(
        calculateVersion(true, 2, {
          author: [],
          buildingBlockType: undefined,
          description: 'some description change',
          falsePositives: undefined,
          query: undefined,
          language: undefined,
          license: undefined,
          outputIndex: undefined,
          savedId: undefined,
          timelineId: undefined,
          timelineTitle: undefined,
          meta: undefined,
          filters: [],
          from: undefined,
          index: undefined,
          interval: undefined,
          maxSignals: undefined,
          riskScore: undefined,
          riskScoreMapping: undefined,
          ruleNameOverride: undefined,
          name: undefined,
          severity: undefined,
          severityMapping: undefined,
          tags: undefined,
          threat: undefined,
          to: undefined,
          timestampOverride: undefined,
          type: undefined,
          references: undefined,
          version: undefined,
          note: undefined,
          anomalyThreshold: undefined,
          machineLearningJobId: undefined,
          exceptionsList: [],
        })
      ).toEqual(2);
    });

    test('returning an updated version number if not given an immutable but but an updated description', () => {
      expect(
        calculateVersion(false, 1, {
          author: [],
          buildingBlockType: undefined,
          description: 'some description change',
          falsePositives: undefined,
          query: undefined,
          language: undefined,
          license: undefined,
          outputIndex: undefined,
          savedId: undefined,
          timelineId: undefined,
          timelineTitle: undefined,
          meta: undefined,
          filters: [],
          from: undefined,
          index: undefined,
          interval: undefined,
          maxSignals: undefined,
          riskScore: undefined,
          riskScoreMapping: undefined,
          ruleNameOverride: undefined,
          name: undefined,
          severity: undefined,
          severityMapping: undefined,
          tags: undefined,
          threat: undefined,
          to: undefined,
          timestampOverride: undefined,
          type: undefined,
          references: undefined,
          version: undefined,
          note: undefined,
          anomalyThreshold: undefined,
          machineLearningJobId: undefined,
          exceptionsList: [],
        })
      ).toEqual(2);
    });
  });

  describe('#calculateName', () => {
    test('should return the updated name when it and originalName is there', () => {
      const name = calculateName({ updatedName: 'updated', originalName: 'original' });
      expect(name).toEqual('updated');
    });

    test('should return the updated name when originalName is undefined', () => {
      const name = calculateName({ updatedName: 'updated', originalName: undefined });
      expect(name).toEqual('updated');
    });

    test('should return the original name when updatedName is undefined', () => {
      const name = calculateName({ updatedName: undefined, originalName: 'original' });
      expect(name).toEqual('original');
    });

    test('should return untitled when both updatedName and originalName is undefined', () => {
      const name = calculateName({ updatedName: undefined, originalName: undefined });
      expect(name).toEqual('untitled');
    });
  });
});

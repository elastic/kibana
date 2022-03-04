/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { maxRiskSubAggregations } from '../flatten/mocks/mock_buckets';
import {
  DataName,
  FillColorDatum,
  getGroupFromPath,
  getLayersOneDimension,
  getLayersMultiDimensional,
} from './layers';

describe('layers', () => {
  describe('getGroupFromPath', () => {
    it('returns the expected group from the path', () => {
      expect(
        getGroupFromPath({
          path: [
            { index: 0, value: '__null_small_multiples_key__' },
            { index: 0, value: '__root_key__' },
            { index: 0, value: 'matches everything' },
            { index: 0, value: 'Host-k8iyfzraq9' },
          ],
        })
      ).toEqual('matches everything');
    });

    it('returns undefined when path is undefined', () => {
      const datumWithUndefinedPath: FillColorDatum = {};

      expect(getGroupFromPath(datumWithUndefinedPath)).toBeUndefined();
    });
  });

  describe('getLayersOneDimension', () => {
    it('returns the expected number of layers', () => {
      expect(getLayersOneDimension(maxRiskSubAggregations).length).toEqual(1);
    });

    it('returns the expected fillLabel valueFormatter function', () => {
      expect(
        getLayersOneDimension(maxRiskSubAggregations)[0].fillLabel.valueFormatter(123)
      ).toEqual('123');
    });

    it('returns the expected groupByRollup function', () => {
      expect(
        getLayersOneDimension(maxRiskSubAggregations)[0].groupByRollup({ key: 'keystone' })
      ).toEqual('keystone');
    });

    it('returns the expected nodeLabel function', () => {
      expect(
        getLayersOneDimension(maxRiskSubAggregations)[0].nodeLabel('matches everything')
      ).toEqual('matches everything (Risk 21)');
    });

    it('returns the expected shape fillColor function', () => {
      const dataName: DataName = { dataName: 'mimikatz process started' };
      expect(getLayersOneDimension(maxRiskSubAggregations)[0].shape.fillColor(dataName)).toEqual(
        '#e7664c'
      );
    });

    it('return the default fill color when dataName is not found in the maxRiskSubAggregations', () => {
      const dataName: DataName = { dataName: 'this does not exist' };
      expect(getLayersOneDimension(maxRiskSubAggregations)[0].shape.fillColor(dataName)).toEqual(
        '#54b399'
      );
    });
  });

  describe('getLayersMultiDimensional', () => {
    it('returns the expected number of layers', () => {
      expect(getLayersMultiDimensional(maxRiskSubAggregations).length).toEqual(2);
    });

    it('returns the expected fillLabel valueFormatter function', () => {
      getLayersMultiDimensional(maxRiskSubAggregations).forEach((x) =>
        expect(x.fillLabel.valueFormatter(123)).toEqual('123')
      );
    });

    it('returns the expected groupByRollup function for layer 0', () => {
      expect(
        getLayersMultiDimensional(maxRiskSubAggregations)[0].groupByRollup({ key: 'keystone' })
      ).toEqual('keystone');
    });

    it('returns the expected groupByRollup function for layer 1, which has a different implementation', () => {
      expect(
        getLayersMultiDimensional(maxRiskSubAggregations)[1].groupByRollup({
          stackByField1Key: 'host.name',
        })
      ).toEqual('host.name');
    });

    it('returns the expected nodeLabel function for layer 0', () => {
      expect(
        getLayersMultiDimensional(maxRiskSubAggregations)[0].nodeLabel('matches everything')
      ).toEqual('matches everything (Risk 21)');
    });

    it('returns the expected nodeLabel function for layer 1, which has a different implementation', () => {
      expect(
        getLayersMultiDimensional(maxRiskSubAggregations)[1].nodeLabel('Host-k8iyfzraq9')
      ).toEqual('Host-k8iyfzraq9');
    });

    it('returns the expected shape fillColor function for layer 0', () => {
      const dataName: DataName = { dataName: 'mimikatz process started' };
      expect(
        getLayersMultiDimensional(maxRiskSubAggregations)[0].shape.fillColor(dataName)
      ).toEqual('#e7664c');
    });

    it('returns the default fillColor function for layer 0 when dataName is not found in the maxRiskSubAggregations', () => {
      const dataName: DataName = { dataName: 'this will not be found' };
      expect(
        getLayersMultiDimensional(maxRiskSubAggregations)[0].shape.fillColor(dataName)
      ).toEqual('#54b399');
    });

    it('returns the expected shape fillColor function for layer 1, which has a different implementation', () => {
      expect(
        getLayersMultiDimensional(maxRiskSubAggregations)[1].shape.fillColor({
          dataName: 'Host-k8iyfzraq9',
          path: [
            { index: 0, value: '__null_small_multiples_key__' },
            { index: 0, value: '__root_key__' },
            { index: 0, value: 'mimikatz process started' },
            { index: 0, value: 'Host-k8iyfzraq9' },
          ],
        })
      ).toEqual('#e7664c');
    });

    it('returns the default fillColor function for layer 1 when the group from path is not found', () => {
      expect(
        getLayersMultiDimensional(maxRiskSubAggregations)[1].shape.fillColor({
          dataName: 'nope',
          path: [
            { index: 0, value: '__null_small_multiples_key__' },
            { index: 0, value: '__root_key__' },
            { index: 0, value: 'matches everything' },
            { index: 0, value: 'nope' },
          ],
        })
      ).toEqual('#54b399');
    });
  });
});

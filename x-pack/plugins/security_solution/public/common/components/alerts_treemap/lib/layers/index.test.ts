/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRiskScorePalette, RISK_SCORE_STEPS } from '../chart_palette';
import { maxRiskSubAggregations } from '../flatten/mocks/mock_buckets';
import type { DataName, FillColorDatum, Path } from '.';
import { getGroupFromPath, getLayersOneDimension, getLayersMultiDimensional } from '.';

describe('layers', () => {
  const colorPalette = getRiskScorePalette(RISK_SCORE_STEPS);

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

    it('returns undefined when path is an empty array', () => {
      expect(
        getGroupFromPath({
          path: [],
        })
      ).toBeUndefined();
    });

    it('returns undefined when path is an array with only one value', () => {
      expect(
        getGroupFromPath({
          path: [{ index: 0, value: '__null_small_multiples_key__' }],
        })
      ).toBeUndefined();
    });
  });

  describe('getLayersOneDimension', () => {
    it('returns the expected number of layers', () => {
      expect(getLayersOneDimension({ colorPalette, maxRiskSubAggregations }).length).toEqual(1);
    });

    it('returns the expected fillLabel valueFormatter function', () => {
      expect(
        getLayersOneDimension({ colorPalette, maxRiskSubAggregations })[0].fillLabel.valueFormatter(
          123
        )
      ).toEqual('123');
    });

    it('returns the expected groupByRollup function', () => {
      expect(
        getLayersOneDimension({ colorPalette, maxRiskSubAggregations })[0].groupByRollup({
          key: 'keystone',
        })
      ).toEqual('keystone');
    });

    it('returns the expected nodeLabel function', () => {
      expect(
        getLayersOneDimension({ colorPalette, maxRiskSubAggregations })[0].nodeLabel(
          'matches everything'
        )
      ).toEqual('matches everything (Risk 21)');
    });

    it('returns the expected shape fillColor function', () => {
      const dataName: DataName = { dataName: 'mimikatz process started' };
      expect(
        getLayersOneDimension({ colorPalette, maxRiskSubAggregations })[0].shape.fillColor(dataName)
      ).toEqual('#e7664c');
    });

    it('return the default fill color when dataName is not found in the maxRiskSubAggregations', () => {
      const dataName: DataName = { dataName: 'this does not exist' };
      expect(
        getLayersOneDimension({ colorPalette, maxRiskSubAggregations })[0].shape.fillColor(dataName)
      ).toEqual('#54b399');
    });
  });

  describe('getLayersMultiDimensional', () => {
    const layer0FillColor = 'transparent';
    it('returns the expected number of layers', () => {
      expect(
        getLayersMultiDimensional({ colorPalette, layer0FillColor, maxRiskSubAggregations }).length
      ).toEqual(2);
    });

    it('returns the expected fillLabel valueFormatter function', () => {
      getLayersMultiDimensional({ colorPalette, layer0FillColor, maxRiskSubAggregations }).forEach(
        (x) => expect(x.fillLabel.valueFormatter(123)).toEqual('123')
      );
    });

    it('returns the expected groupByRollup function for layer 0', () => {
      expect(
        getLayersMultiDimensional({
          colorPalette,
          layer0FillColor,
          maxRiskSubAggregations,
        })[0].groupByRollup({
          key: 'keystone',
        })
      ).toEqual('keystone');
    });

    it('returns the expected groupByRollup function for layer 1, which has a different implementation', () => {
      expect(
        getLayersMultiDimensional({
          colorPalette,
          layer0FillColor,
          maxRiskSubAggregations,
        })[1].groupByRollup({
          stackByField1Key: 'host.name',
        })
      ).toEqual('host.name');
    });

    it('returns the expected nodeLabel function for layer 0', () => {
      expect(
        getLayersMultiDimensional({
          colorPalette,
          layer0FillColor,
          maxRiskSubAggregations,
        })[0].nodeLabel('matches everything')
      ).toEqual('matches everything (Risk 21)');
    });

    it('returns the expected nodeLabel function for layer 1, which has a different implementation', () => {
      expect(
        getLayersMultiDimensional({
          colorPalette,
          layer0FillColor,
          maxRiskSubAggregations,
        })[1].nodeLabel('Host-k8iyfzraq9')
      ).toEqual('Host-k8iyfzraq9');
    });

    it('returns the expected shape fillColor for layer 0', () => {
      expect(
        getLayersMultiDimensional({ colorPalette, layer0FillColor, maxRiskSubAggregations })[0]
          .shape.fillColor
      ).toEqual(layer0FillColor);
    });

    it('returns the expected shape fill color function for layer 1, which has a different implementation', () => {
      const fillColorFn = getLayersMultiDimensional({
        colorPalette,
        layer0FillColor,
        maxRiskSubAggregations,
      })[1].shape.fillColor as ({ dataName, path }: { dataName: string; path: Path[] }) => string;

      expect(
        fillColorFn({
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

    it('returns the default fillColor for layer 1 when the group from path is not found', () => {
      const fillColorFn = getLayersMultiDimensional({
        colorPalette,
        layer0FillColor,
        maxRiskSubAggregations,
      })[1].shape.fillColor as ({ dataName, path }: { dataName: string; path: Path[] }) => string;

      expect(
        fillColorFn({
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

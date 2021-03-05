/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Boost, BoostFunction, BoostType, BoostOperation, FunctionalBoostFunction } from '../types';

import { getBoostSummary } from './get_boost_summary';

describe('getBoostSummary', () => {
  describe('when the boost type is "value"', () => {
    const boost: Boost = {
      type: BoostType.Value,
      value: ['1', '2'],
      factor: 5,
    };

    it('creates a summary that is the joined values', () => {
      expect(getBoostSummary(boost)).toEqual('1,2');
    });

    it('creates an empty summary if there is no value', () => {
      expect(
        getBoostSummary({
          ...boost,
          value: undefined,
        })
      ).toEqual('');
    });

    it('filters out empty values', () => {
      expect(
        getBoostSummary({
          ...boost,
          value: [' ', '', 'foo', '', 'bar'],
        })
      ).toEqual('foo,bar');
    });
  });

  describe('when the boost type is "proximity"', () => {
    const boost: Boost = {
      type: BoostType.Proximity,
      function: 'gaussian' as BoostFunction,
      factor: 5,
    };

    it('creates a summary that is just the name of the function', () => {
      expect(getBoostSummary(boost)).toEqual('gaussian');
    });

    it('creates an empty summary if there is no function', () => {
      expect(
        getBoostSummary({
          ...boost,
          function: undefined,
        })
      ).toEqual('');
    });
  });

  describe('when the boost type is "functional"', () => {
    const boost: Boost = {
      type: BoostType.Functional,
      function: FunctionalBoostFunction.Logarithmic,
      operation: BoostOperation.Add,
      factor: 5,
    };

    it('creates a summary that is name of the function and operation', () => {
      expect(getBoostSummary(boost)).toEqual('logarithmic add');
    });

    it('prints empty if function or operation is missing', () => {
      expect(getBoostSummary({ ...boost, function: undefined })).toEqual(BoostOperation.Add);
      expect(getBoostSummary({ ...boost, operation: undefined })).toEqual(
        FunctionalBoostFunction.Logarithmic
      );
      expect(getBoostSummary({ ...boost, function: undefined, operation: undefined })).toEqual('');
    });
  });
});

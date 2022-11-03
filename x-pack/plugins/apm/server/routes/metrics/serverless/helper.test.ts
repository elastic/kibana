/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  calcMemoryUsed,
  calcMemoryUsedRate,
  calcEstimatedCost,
} from './helper';
describe('calcMemoryUsed', () => {
  it('returns undefined when memory values are no a number', () => {
    [
      { memoryFree: null, memoryTotal: null },
      { memoryFree: undefined, memoryTotal: undefined },
      { memoryFree: 100, memoryTotal: undefined },
      { memoryFree: undefined, memoryTotal: 100 },
    ].forEach(({ memoryFree, memoryTotal }) => {
      expect(calcMemoryUsed({ memoryFree, memoryTotal })).toBeUndefined();
    });
  });

  it('returns correct memory used', () => {
    expect(calcMemoryUsed({ memoryFree: 50, memoryTotal: 100 })).toBe(50);
  });
});

describe('calcMemoryUsedRate', () => {
  it('returns undefined when memory values are no a number', () => {
    [
      { memoryFree: null, memoryTotal: null },
      { memoryFree: undefined, memoryTotal: undefined },
      { memoryFree: 100, memoryTotal: undefined },
      { memoryFree: undefined, memoryTotal: 100 },
    ].forEach(({ memoryFree, memoryTotal }) => {
      expect(calcMemoryUsedRate({ memoryFree, memoryTotal })).toBeUndefined();
    });
  });

  it('returns correct memory used rate', () => {
    expect(calcMemoryUsedRate({ memoryFree: 50, memoryTotal: 100 })).toBe(0.5);
  });
});

const AWS_LAMBDA_PRICE_FACTOR = {
  x86_64: 0.0000166667,
  arm: 0.0000133334,
};

describe('calcEstimatedCost', () => {
  it('returns undefined when price factor is not defined', () => {
    expect(
      calcEstimatedCost({
        totalMemory: 1,
        billedDuration: 1,
        transactionThroughput: 1,
        architecture: 'arm',
      })
    ).toBeUndefined();
  });

  it('returns undefined when architecture is not defined', () => {
    expect(
      calcEstimatedCost({
        totalMemory: 1,
        billedDuration: 1,
        transactionThroughput: 1,
        awsLambdaPriceFactor: AWS_LAMBDA_PRICE_FACTOR,
      })
    ).toBeUndefined();
  });

  it('returns undefined when compute usage is not defined', () => {
    expect(
      calcEstimatedCost({
        transactionThroughput: 1,
        awsLambdaPriceFactor: AWS_LAMBDA_PRICE_FACTOR,
        architecture: 'arm',
      })
    ).toBeUndefined();
  });

  it('returns undefined when request cost per million is not defined', () => {
    expect(
      calcEstimatedCost({
        totalMemory: 1,
        billedDuration: 1,
        transactionThroughput: 1,
        awsLambdaPriceFactor: AWS_LAMBDA_PRICE_FACTOR,
        architecture: 'arm',
      })
    ).toBeUndefined();
  });

  describe('x86_64 architecture', () => {
    const architecture = 'x86_64';
    it('returns correct cost', () => {
      expect(
        calcEstimatedCost({
          awsLambdaPriceFactor: AWS_LAMBDA_PRICE_FACTOR,
          architecture,
          billedDuration: 4000,
          totalMemory: 536870912, // 0.5gb
          transactionThroughput: 100000,
          awsLambdaRequestCostPerMillion: 0.2,
          countInvocations: 1,
        })
      ).toEqual(0.03);
    });
  });
  describe('arm architecture', () => {
    const architecture = 'arm';
    it('returns correct cost', () => {
      expect(
        calcEstimatedCost({
          awsLambdaPriceFactor: AWS_LAMBDA_PRICE_FACTOR,
          architecture,
          billedDuration: 8000,
          totalMemory: 536870912, // 0.5gb
          transactionThroughput: 200000,
          awsLambdaRequestCostPerMillion: 0.2,
          countInvocations: 1,
        })
      ).toEqual(0.05);
    });
  });
});

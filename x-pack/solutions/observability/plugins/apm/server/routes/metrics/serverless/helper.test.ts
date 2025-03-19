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
  convertComputeUsageToGbSec,
} from './helper';

describe('convertComputeUsageToGbSec', () => {
  it('returns undefined', () => {
    [
      { computeUsageBytesMs: undefined, countInvocations: 1 },
      { computeUsageBytesMs: null, countInvocations: 1 },
      { computeUsageBytesMs: 1, countInvocations: undefined },
      { computeUsageBytesMs: 1, countInvocations: null },
    ].forEach(({ computeUsageBytesMs, countInvocations }) => {
      expect(convertComputeUsageToGbSec({ computeUsageBytesMs, countInvocations })).toBeUndefined();
    });
  });

  it('converts to gb sec', () => {
    const totalMemory = 536870912; // 0.5gb
    const billedDuration = 4000;
    const computeUsageBytesMs = totalMemory * billedDuration;
    expect(convertComputeUsageToGbSec({ computeUsageBytesMs, countInvocations: 1 })).toBe(
      computeUsageBytesMs / 1024 ** 3 / 1000
    );
  });
});
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
  const totalMemory = 536870912; // 0.5gb
  const billedDuration = 4000;
  const computeUsageBytesMs = totalMemory * billedDuration;
  const computeUsageGbSec = convertComputeUsageToGbSec({
    computeUsageBytesMs,
    countInvocations: 1,
  });
  it('returns undefined when price factor is not defined', () => {
    expect(
      calcEstimatedCost({
        transactionThroughput: 1,
        architecture: 'arm',
        computeUsageGbSec,
      })
    ).toBeUndefined();
  });

  it('returns undefined when architecture is not defined', () => {
    expect(
      calcEstimatedCost({
        transactionThroughput: 1,
        awsLambdaPriceFactor: AWS_LAMBDA_PRICE_FACTOR,
        computeUsageGbSec,
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
        transactionThroughput: 1,
        awsLambdaPriceFactor: AWS_LAMBDA_PRICE_FACTOR,
        architecture: 'arm',
        computeUsageGbSec,
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
          transactionThroughput: 100000,
          awsLambdaRequestCostPerMillion: 0.2,
          computeUsageGbSec,
        })
      ).toEqual(0.03);
    });
  });
  describe('arm architecture', () => {
    const architecture = 'arm';
    it('returns correct cost', () => {
      const _totalMemory = 536870912; // 0.5gb
      const _billedDuration = 8000;
      const _computeUsageBytesMs = _totalMemory * _billedDuration;
      const _computeUsageGbSec = convertComputeUsageToGbSec({
        computeUsageBytesMs: _computeUsageBytesMs,
        countInvocations: 1,
      });
      expect(
        calcEstimatedCost({
          awsLambdaPriceFactor: AWS_LAMBDA_PRICE_FACTOR,
          architecture,
          transactionThroughput: 200000,
          awsLambdaRequestCostPerMillion: 0.2,
          computeUsageGbSec: _computeUsageGbSec,
        })
      ).toEqual(0.05);
    });
  });
});

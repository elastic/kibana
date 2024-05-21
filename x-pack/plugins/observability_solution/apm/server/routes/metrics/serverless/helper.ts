/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isFiniteNumber } from '../../../../common/utils/is_finite_number';
import { AwsLambdaArchitecture, AWSLambdaPriceFactor } from './get_serverless_summary';

export function calcMemoryUsedRate({
  memoryFree,
  memoryTotal,
}: {
  memoryFree?: number | null;
  memoryTotal?: number | null;
}) {
  if (!isFiniteNumber(memoryFree) || !isFiniteNumber(memoryTotal)) {
    return undefined;
  }

  return (memoryTotal - memoryFree) / memoryTotal;
}

export function calcMemoryUsed({
  memoryFree,
  memoryTotal,
}: {
  memoryFree?: number | null;
  memoryTotal?: number | null;
}) {
  if (!isFiniteNumber(memoryFree) || !isFiniteNumber(memoryTotal)) {
    return undefined;
  }

  return memoryTotal - memoryFree;
}

const GB = 1024 ** 3;
/**
 * To calculate the compute usage we need to multiply the "system.memory.total" by "faas.billed_duration".
 * But the result of this calculation is in Bytes-milliseconds, as the "system.memory.total" is stored in bytes and the "faas.billed_duration" is stored in milliseconds.
 * But to calculate the overall cost AWS uses GB-second, so we need to convert the result to this unit.
 */
export function convertComputeUsageToGbSec({
  computeUsageBytesMs,
  countInvocations,
}: {
  computeUsageBytesMs?: number | null;
  countInvocations?: number | null;
}) {
  if (!isFiniteNumber(computeUsageBytesMs) || !isFiniteNumber(countInvocations)) {
    return undefined;
  }
  const computeUsageGbSec = computeUsageBytesMs / GB / 1000;
  return computeUsageGbSec * countInvocations;
}

export function calcEstimatedCost({
  awsLambdaPriceFactor,
  architecture,
  transactionThroughput,
  awsLambdaRequestCostPerMillion,
  computeUsageGbSec,
}: {
  awsLambdaPriceFactor?: AWSLambdaPriceFactor;
  architecture?: AwsLambdaArchitecture;
  transactionThroughput: number;
  awsLambdaRequestCostPerMillion?: number;
  computeUsageGbSec?: number;
}) {
  try {
    if (
      !awsLambdaPriceFactor ||
      !architecture ||
      !isFiniteNumber(awsLambdaRequestCostPerMillion) ||
      !isFiniteNumber(awsLambdaPriceFactor?.[architecture]) ||
      !isFiniteNumber(computeUsageGbSec)
    ) {
      return undefined;
    }

    const priceFactor = awsLambdaPriceFactor?.[architecture];

    const estimatedCost =
      computeUsageGbSec * priceFactor +
      transactionThroughput * (awsLambdaRequestCostPerMillion / 1000000);

    // Rounds up the decimals
    return Math.ceil(estimatedCost * 100) / 100;
  } catch (e) {
    return undefined;
  }
}

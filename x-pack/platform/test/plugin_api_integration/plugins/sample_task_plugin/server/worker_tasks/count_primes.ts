/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Pure CPU-bound compute shared by the two worker-thread demos in this fixture plugin:
 * - `sampleWorkerTask` wraps it in the `workerModuleId` contract (see `count_primes_worker.ts`).
 * - `sampleTaskUsingRunInWorker` calls this module directly via `context.runInWorker(...)`,
 *   demonstrating that any classic closure-based task can offload a CPU-heavy portion.
 * Has no dependency on any Kibana service - workers get none.
 */
function isPrime(candidate: number): boolean {
  if (candidate < 2) {
    return false;
  }
  for (let divisor = 2; divisor * divisor <= candidate; divisor++) {
    if (candidate % divisor === 0) {
      return false;
    }
  }
  return true;
}

export interface CountPrimesInput {
  limit: number;
}

export interface CountPrimesResult {
  limit: number;
  primeCount: number;
}

export default function countPrimes({ limit }: CountPrimesInput): CountPrimesResult {
  let primeCount = 0;
  for (let candidate = 2; candidate < limit; candidate++) {
    if (isPrime(candidate)) {
      primeCount++;
    }
  }
  return { limit, primeCount };
}

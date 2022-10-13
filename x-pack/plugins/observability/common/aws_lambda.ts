/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const enum AwsLambdaArchitecture {
  x86 = 'x86',
  arm = 'arm',
}

export interface AwsLambdaPriceFactor {
  x86: Record<number, number>;
  arm: Record<number, number>;
}

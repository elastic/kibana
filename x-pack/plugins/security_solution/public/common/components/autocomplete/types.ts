/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export enum Operator {
  INCLUDED = 'included',
  EXCLUDED = 'excluded',
}

export enum OperatorType {
  MATCH = 'match',
  MATCH_ANY = 'match_any',
  EXISTS = 'exists',
  LIST = 'list',
}

export interface OperatorOption {
  message: string;
  value: string;
  operator: Operator;
  type: OperatorType;
}

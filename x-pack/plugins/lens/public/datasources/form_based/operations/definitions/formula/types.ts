/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TinymathAST,
  TinymathFunction,
  TinymathNamedArgument,
  TinymathVariable,
} from '@kbn/tinymath';

export type GroupedNodes = {
  [Key in TinymathNamedArgument['type']]: TinymathNamedArgument[];
} & {
  [Key in TinymathVariable['type']]: Array<TinymathVariable | string | number>;
} & {
  [Key in TinymathFunction['type']]: TinymathFunction[];
};

export type TinymathNodeTypes = Exclude<TinymathAST, number>;

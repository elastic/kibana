/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { View, Model, Transform } from '../../expression_types/types';

export type State = 'ready' | 'error' | 'pending';
export interface Context {
  error: string;
  state?: State;
  value?: unknown;
}

export type ExpressionType = View | Model | Transform;
export type ArgDefType = View | Model | Transform;

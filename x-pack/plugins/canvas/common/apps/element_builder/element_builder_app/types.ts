/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Ast } from '@kbn/interpreter/target/common';
import { CanvasFunction } from '../../../../types';

export interface ElementBuilderState {
  expression: string;
  functionDefinitions: CanvasFunction[];
  ast: Ast | null;
  output: object | null;
}

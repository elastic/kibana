/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionAstExpression } from 'src/plugins/expressions';
import { CanvasFunction } from '../../../../types';

export interface ExpressionExplorer {
  expression: string;
  functionDefinitions: CanvasFunction[];
  ast: ExpressionAstExpression | null;
  output: object | null;
}

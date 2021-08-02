/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import {
  ExpressionAstExpression,
  ExpressionValue,
} from '../../../../../../src/plugins/expressions/common';
import { ArgType, Arg, ArgTypeDef } from '../../expression_types/types';
import { ExpressionType } from './types';
import { AssetType, CanvasElement, ExpressionContext } from '../../../types';

interface FunctionFormComponentProps {
  argResolver: (ast: ExpressionAstExpression) => Promise<ExpressionValue>;
  args: Arg[];
  argType: ArgType;
  argTypeDef: ArgTypeDef;
  filterGroups: string[];
  context?: ExpressionContext;
  expressionIndex: number;
  expressionType: ExpressionType;
  nextArgType?: ArgType;
  nextExpressionType?: ExpressionType;
  onValueAdd: (argName: string, argValue: Arg) => () => void;
  onAssetAdd: (type: AssetType['type'], content: AssetType['value']) => string;
  onValueChange: (argName: string, argIndex: number) => (value: Arg) => void;
  onValueRemove: (argName: string, argIndex: number) => () => void;
  updateContext: (element?: CanvasElement) => void;
}

export const FunctionFormComponent: FunctionComponent<FunctionFormComponentProps> = (props) => (
  <div className="canvasFunctionForm">{props.expressionType.render(props)}</div>
);

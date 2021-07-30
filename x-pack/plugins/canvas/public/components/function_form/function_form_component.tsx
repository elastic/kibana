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
import { ArgType, Arg } from '../../expression_types/types';
import { Context, ExpressionType, ArgDefType } from './types';
import { ElementSpec } from '../../../types';

interface FunctionFormComponentProps {
  argResolver: (ast: ExpressionAstExpression) => Promise<ExpressionValue>;
  args: Arg[];
  argType: ArgType;
  argTypeDef: ArgDefType;
  filterGroups: string[];
  context?: Context;
  expressionIndex: number;
  expressionType: ExpressionType;
  nextArgType?: ArgType;
  nextExpressionType?: ExpressionType;
  onValueAdd: (argName: string, argValue: unknown) => () => void;
  onAssetAdd: (type: string, content: string) => string;
  onValueChange: (argName: string, argIndex: number) => (value: unknown) => void;
  onValueRemove: (argName: string, argIndex: number) => () => void;
  updateContext: (element?: ElementSpec) => void;
}

export const FunctionFormComponent: FunctionComponent<FunctionFormComponentProps> = (props) => (
  <div className="canvasFunctionForm">{props.expressionType.render(props)}</div>
);

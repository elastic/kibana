/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import { createElement } from 'react';
import { Ast } from '@kbn/interpreter';
// @ts-expect-error unconverted components
import { ArgForm } from '../components/arg_form';
import { argTypeRegistry } from './arg_type_registry';
import type { ArgType, ArgTypeDef, ExpressionType } from './types';
import {
  AssetType,
  CanvasElement,
  ExpressionAstExpression,
  ExpressionValue,
  ExpressionContext,
} from '../../types';
import { BaseFormProps } from './base_form';

interface ArtOwnProps {
  argType: ArgType;
  multi?: boolean;
  required?: boolean;
  types?: string[];
  default?: string | null;
  resolve?: (...args: any[]) => any;
  options?: {
    include?: string[];
    confirm?: string;
    labelValue?: string;
    choices?: Array<{ name: string; value: string }>;
    min?: number;
    max?: number;
    shapes?: string[];
  };
}
export type ArgProps = ArtOwnProps & BaseFormProps;

export interface DataArg {
  argValue?: string | Ast | null;
  skipRender?: boolean;
  label?: string;
  valueIndex: number;
  key?: string;
  labels?: string[];
  contextExpression?: string;
  name: string;
  argResolver: (ast: ExpressionAstExpression) => Promise<ExpressionValue>;
  args: Record<string, Array<string | Ast>> | null;
  argType: ArgType;
  argTypeDef?: ArgTypeDef;
  filterGroups: string[];
  context?: ExpressionContext;
  expressionIndex: number;
  expressionType: ExpressionType;
  nextArgType?: ArgType;
  nextExpressionType?: ExpressionType;
  onValueAdd: (argName: string, argValue: string | Ast | null) => () => void;
  onAssetAdd: (type: AssetType['type'], content: AssetType['value']) => string;
  onValueChange: (value: Ast | string) => void;
  onValueRemove: () => void;
  updateContext: (element?: CanvasElement) => void;
  typeInstance?: ExpressionType;
}

export class Arg {
  argType?: ArgType;
  multi?: boolean;
  required?: boolean;
  types?: string[];
  default?: string | null;
  resolve?: (...args: any[]) => any;
  options?: {
    include: string[];
  };
  name: string = '';
  displayName?: string;
  help?: string;

  constructor(props: ArgProps) {
    const argType = argTypeRegistry.get(props.argType);
    if (!argType) {
      throw new Error(`Invalid arg type: ${props.argType}`);
    }
    if (!props.name) {
      throw new Error('Args must have a name property');
    }

    // properties that can be overridden
    const defaultProps = {
      multi: false,
      required: false,
      types: [],
      default: argType.default != null ? argType.default : null,
      options: {},
      resolve: () => ({}),
    };

    const { name, displayName, help, multi, types, options } = props;

    merge(this, defaultProps, argType, {
      argType,
      name,
      displayName,
      help,
      multi,
      types,
      default: props.default,
      resolve: props.resolve,
      required: props.required,
      options,
    });
  }

  // TODO: Document what these otherProps are. Maybe make them named arguments?
  render(data: DataArg) {
    const { onValueChange, onValueRemove, argValue, key, label, ...otherProps } = data;
    // This is everything the arg_type template needs to render
    const templateProps = {
      ...otherProps,
      ...this.resolve?.(otherProps),
      onValueChange,
      argValue,
      typeInstance: this,
    };

    const formProps = {
      key,
      argTypeInstance: this,
      valueMissing: this.required && argValue == null,
      label,
      onValueChange,
      onValueRemove,
      templateProps,
      argId: key,
      options: this.options,
    };

    return createElement(ArgForm, formProps);
  }
}

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
import type { Args, ArgType, ArgTypeDef, ArgValue, ExpressionType } from './types';
import {
  AssetType,
  CanvasElement,
  ExpressionAstExpression,
  ExpressionValue,
  ExpressionContext,
  DatatableColumn,
} from '../../types';
import { BaseFormProps } from './base_form';

interface ArtOwnProps {
  argType: ArgType;
  multi?: boolean;
  required?: boolean;
  types?: string[];
  type?: 'model' | 'argument';
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
export type ArgUiConfig = ArtOwnProps & BaseFormProps;

export interface ResolvedColumns {
  columns: DatatableColumn[];
}
export interface ResolvedLabels {
  labels: string[];
}

export interface ResolvedDataurl {
  dataurl: string;
}

export interface ResolvedArgProps<T = ResolvedColumns | ResolvedLabels | ResolvedDataurl | {}> {
  resolved: T;
}

export interface DataArg {
  argValue?: ArgValue | null;
  skipRender?: boolean;
  label?: string;
  valueIndex: number;
  key?: string;
  labels?: string[];
  contextExpression?: string;
  name: string;
  argResolver: (ast: ExpressionAstExpression) => Promise<ExpressionValue>;
  args: Args;
  argType: ArgType;
  argTypeDef?: ArgTypeDef;
  filterGroups: string[];
  context?: ExpressionContext;
  expressionType: ExpressionType;
  nextArgType?: ArgType;
  nextExpressionType?: ExpressionType;
  onValueAdd: (argName: string, argValue: ArgValue | null) => () => void;
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

  constructor(props: ArgUiConfig) {
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
  render(data: DataArg & ResolvedArgProps) {
    const { onValueChange, onValueRemove, key, label, ...otherProps } = data;
    const resolvedProps = this.resolve?.(otherProps);
    const { argValue, onAssetAdd, resolved, filterGroups, argResolver } = otherProps;
    const argId = key;
    // This is everything the arg_type template needs to render
    const templateProps = {
      argValue,
      argId,
      onAssetAdd,
      onValueChange,
      typeInstance: this,
      resolved: { ...resolved, ...resolvedProps },
      argResolver,
      filterGroups,
    };

    const formProps = {
      key,
      argTypeInstance: this,
      valueMissing: this.required && data.argValue == null,
      label,
      onValueChange,
      onValueRemove,
      templateProps,
      argId,
      options: this.options,
    };

    return createElement(ArgForm, formProps);
  }
}

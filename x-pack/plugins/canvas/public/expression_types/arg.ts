/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement } from 'react';
import { pick } from 'lodash';
import { Ast } from '@kbn/interpreter/common';
// @ts-expect-error unconverted components
import { ArgForm } from '../components/arg_form';
import { argTypeRegistry } from './arg_type_registry';
import { ArgType } from './types';
import { FunctionFormProps } from './function_form';

interface ArtOwnProps {
  argType: ArgType | undefined;
  multi?: boolean;
  required?: boolean;
  types?: string[];
  default?: string | null;
  resolve?: (...args: any[]) => any;
  options?: string[];
}

export type ArgProps = ArtOwnProps & FunctionFormProps;

export interface DataArg {
  argValue?: string | Ast;
  skipRender?: boolean;
  label?: 'string';
  valueIndex: number;
  onValueAdd?: (argName: string, argValue: string | Ast | null) => void;
  onValueChange?: (value: string | Ast) => void;
  onValueRemove?: () => void;
  key?: string;
}

export class Arg {
  multi?: boolean;
  required?: boolean;
  types?: string[];
  default?: string | null;
  resolve?: (...args: any[]) => any;
  options?: string[];
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

    const viewOverrides = {
      argType,
      ...pick(props, [
        'name',
        'displayName',
        'help',
        'multi',
        'required',
        'types',
        'default',
        'resolve',
        'options',
      ]),
    };

    Object.assign(this, defaultProps, argType, viewOverrides);
  }

  // TODO: Document what these otherProps are. Maybe make them named arguments?
  render({ onValueChange, onValueRemove, argValue, key, label, ...otherProps }: DataArg) {
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
    };

    return createElement(ArgForm, formProps);
  }
}

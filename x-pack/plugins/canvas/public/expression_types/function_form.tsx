/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactElement } from 'react';
import { EuiButtonIcon, EuiCallOut, EuiFlexGroup, EuiFormRow, EuiToolTip } from '@elastic/eui';
import { isPlainObject, uniq, last, compact } from 'lodash';
import { Ast, fromExpression } from '@kbn/interpreter';
import { ArgAddPopover, ArgOptions } from '../components/arg_add_popover';
// @ts-expect-error unconverted components
import { SidebarSection } from '../components/sidebar/sidebar_section';
// @ts-expect-error unconverted components
import { SidebarSectionTitle } from '../components/sidebar/sidebar_section_title';
import { BaseForm, BaseFormProps } from './base_form';
import { Arg, ArgUiConfig, ResolvedArgProps } from './arg';
import { ArgDisplayType, Args, ArgType, ArgTypeDef, ArgValue, ExpressionType } from './types';
import { Model, Transform, View } from '.';
import {
  AssetType,
  CanvasElement,
  ExpressionAstExpression,
  ExpressionContext,
  ExpressionValue,
} from '../../types';
import { buildDefaultArgExpr, getArgTypeDef } from '../lib/args';

export interface ArgWithValues {
  arg: Arg | undefined;
  argValues?: Array<ArgValue | null>;
}

export type RenderArgData = BaseFormProps & {
  argType: ArgType;
  removable?: boolean;
  type?: ArgDisplayType;
  argTypeDef?: ArgTypeDef;
  args: Args;
  id: string;
  nestedFunctionsArgs: Args;
  argResolver: (ast: ExpressionAstExpression) => Promise<ExpressionValue>;
  context?: ExpressionContext;
  contextExpression?: string;
  expressionType: ExpressionType;
  filterGroups: string[];
  nextArgType?: ArgType;
  nextExpressionType?: ExpressionType;
  onValueAdd: (argName: string, argValue: ArgValue | null) => () => void;
  onValueChange: (argName: string, argIndex: number) => (value: string | Ast) => void;
  onValueRemove: (argName: string, argIndex: number) => () => void;
  onContainerRemove: () => void;
  onAssetAdd: (type: AssetType['type'], content: AssetType['value']) => string;
  updateContext: (element?: CanvasElement) => void;
  typeInstance?: ExpressionType;
};

export type RenderArgProps = {
  typeInstance: FunctionForm;
} & RenderArgData &
  ResolvedArgProps;

export type FunctionFormProps = {
  args?: ArgUiConfig[];
  resolve?: (...args: any[]) => any;
} & BaseFormProps;

export class FunctionForm extends BaseForm {
  /**
   * UI arguments config
   */
  args: ArgUiConfig[];
  resolve: (...args: any[]) => any;

  constructor(props: FunctionFormProps) {
    super({ ...props });

    this.args = props.args || [];
    this.resolve = props.resolve || (() => ({}));
  }

  renderArg(argWithValues: ArgWithValues, props: RenderArgProps) {
    const { onValueRemove, onValueChange, onContainerRemove, id, ...passedProps } = props;
    const { arg, argValues } = argWithValues;
    // TODO: show some information to the user than an argument was skipped
    if (!arg) {
      return null;
    }

    const renderArgWithProps = (
      argValue: string | Ast | null,
      valueIndex: number
    ): ReactElement<any, any> | null =>
      arg.render({
        key: `${id}.${arg.name}.${valueIndex}`,
        ...passedProps,
        valueIndex,
        onValueChange: onValueChange(arg.name, valueIndex),
        onValueRemove: onValueRemove(arg.name, valueIndex),
        argValue: argValue ?? null,
      });

    // render the argument's template, wrapped in a remove control
    // if the argument is required but not included, render the control anyway
    if (!argValues && arg.required) {
      return renderArgWithProps(null, 0);
    }

    // render all included argument controls
    return argValues && argValues.map(renderArgWithProps);
  }

  getArgDescription({ name, displayName, help }: Arg | ArgTypeDef, argUiConfig: ArgUiConfig) {
    return {
      name: argUiConfig.name ?? name ?? '',
      displayName: argUiConfig.displayName ?? displayName,
      help: argUiConfig.help ?? help,
    };
  }

  getAddableArgComplex(
    argUiConfig: ArgUiConfig,
    argValues: Array<ArgValue | null>,
    onValueAdd: RenderArgProps['onValueAdd']
  ) {
    if (argValues && !argUiConfig.multi) {
      return null;
    }

    const argExpression = buildDefaultArgExpr(argUiConfig);

    const arg = getArgTypeDef(argUiConfig.argType);
    if (!arg || argExpression === undefined) {
      return null;
    }

    const value = argExpression === null ? null : fromExpression(argExpression, 'argument');

    return {
      ...this.getArgDescription(arg, argUiConfig),
      onValueAdd: onValueAdd(argUiConfig.name, value),
    };
  }

  getAddableArgSimple(
    argUiConfig: ArgUiConfig,
    argValues: Array<ArgValue | null>,
    onValueAdd: RenderArgProps['onValueAdd']
  ) {
    const arg = new Arg(argUiConfig);

    // skip arguments that aren't defined in the expression type schema
    if (!arg || arg.required) {
      return null;
    }

    if (argValues && !arg.multi) {
      return null;
    }

    const value =
      arg.default === null || arg.default === undefined
        ? null
        : fromExpression(arg.default, 'argument');
    return { ...this.getArgDescription(arg, argUiConfig), onValueAdd: onValueAdd(arg.name, value) };
  }

  getAddableArgs(
    simpleFunctionArgs: RenderArgData['args'] = {},
    nestedFunctionsArgs: RenderArgData['nestedFunctionsArgs'] = {},
    onValueAdd: RenderArgData['onValueAdd']
  ) {
    const simpleArgs = simpleFunctionArgs === null ? {} : simpleFunctionArgs;
    const complexArgs = nestedFunctionsArgs === null ? {} : nestedFunctionsArgs;
    const addableArgs = this.args.reduce<ArgOptions[]>((addable, arg) => {
      if (!arg.type || arg.type === 'argument') {
        const addableArg = this.getAddableArgSimple(arg, simpleArgs[arg.name], onValueAdd);
        return addableArg ? [...addable, addableArg] : addable;
      }

      const addableArg = this.getAddableArgComplex(arg, complexArgs[arg.name], onValueAdd);
      return addableArg ? [...addable, addableArg] : addable;
    }, []);

    return addableArgs;
  }

  getArgsWithValues(args: RenderArgData['args'], argTypeDef: RenderArgData['argTypeDef']) {
    let argInstances: Arg[] = [];
    if (this.isExpressionFunctionForm(argTypeDef)) {
      const argNames = argTypeDef.args.map(({ name }) => name);
      argInstances = this.args
        .filter((arg) => argNames.includes(arg.name))
        .map((argSpec) => new Arg(argSpec));
    } else {
      argInstances = this.args.map((argSpec) => new Arg(argSpec));
    }

    if (args === null || !isPlainObject(args)) {
      throw new Error(`Form "${this.name}" expects "args" object`);
    }
    // get a mapping of arg values from the expression and from the renderable's schema
    const argNames = uniq(this.args.map((arg) => arg.name).concat(Object.keys(args)));

    return argNames.map((argName) => {
      const arg = argInstances.find((argument) => argument.name === argName);
      // if arg is not multi, only preserve the last value found
      // otherwise, leave the value alone (including if the arg is not defined)
      const isMulti = arg && arg.multi;
      const argValues = args[argName] && !isMulti ? [last(args[argName]) ?? null] : args[argName];

      return { arg, argValues };
    });
  }

  resolveArg(...args: unknown[]) {
    // basically a no-op placeholder
    return {};
  }

  private isExpressionFunctionForm(
    argTypeDef?: ArgTypeDef
  ): argTypeDef is View | Model | Transform {
    return (
      !!argTypeDef &&
      (argTypeDef instanceof View || argTypeDef instanceof Model || argTypeDef instanceof Transform)
    );
  }

  render(data: RenderArgData = { args: null, argTypeDef: undefined } as RenderArgData) {
    const { args, argTypeDef, nestedFunctionsArgs = {}, removable } = data;
    const argsWithValues = this.getArgsWithValues(args, argTypeDef);
    try {
      // props are passed to resolve and the returned object is mixed into the template props
      const props: RenderArgProps = { ...data, resolved: this.resolve(data), typeInstance: this };

      // allow a hook to override the data args
      const resolvedArgsWithValues = argsWithValues.map((argWithValues) => ({
        ...argWithValues,
        ...this.resolveArg(argWithValues, props),
      }));

      const argumentForms = compact(
        resolvedArgsWithValues.map((argWithValues) => this.renderArg(argWithValues, props))
      );

      const addableArgs = this.getAddableArgs(args, nestedFunctionsArgs, props.onValueAdd);
      if (!addableArgs.length && !argumentForms.length) {
        return null;
      }
      return (
        <SidebarSection>
          <SidebarSectionTitle title={argTypeDef?.displayName} tip={argTypeDef?.help}>
            <EuiFormRow>
              <EuiFlexGroup direction="row" gutterSize="s">
                {removable && (
                  <EuiToolTip position="top" content={'Remove'}>
                    <EuiButtonIcon
                      color="text"
                      onClick={() => {
                        props.onContainerRemove();
                      }}
                      iconType="cross"
                      iconSize="s"
                      aria-label={'Remove'}
                      className="canvasArg__remove"
                    />
                  </EuiToolTip>
                )}
                {addableArgs.length === 0 ? null : <ArgAddPopover options={addableArgs} />}
              </EuiFlexGroup>
            </EuiFormRow>
          </SidebarSectionTitle>
          {argumentForms}
        </SidebarSection>
      );
    } catch (e: any) {
      return (
        <EuiCallOut color="danger" iconType="cross" title="Expression rendering error">
          <p>{e.message}</p>
        </EuiCallOut>
      );
    }
  }
}

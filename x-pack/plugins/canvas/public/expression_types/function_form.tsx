/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactElement } from 'react';
import { EuiCallOut } from '@elastic/eui';
import { isPlainObject, uniq, last, compact } from 'lodash';
import { Ast, fromExpression } from '@kbn/interpreter';
import { ArgAddPopover } from '../components/arg_add_popover';
// @ts-expect-error unconverted components
import { SidebarSection } from '../components/sidebar/sidebar_section';
// @ts-expect-error unconverted components
import { SidebarSectionTitle } from '../components/sidebar/sidebar_section_title';
import { BaseForm, BaseFormProps } from './base_form';
import { Arg, ArgProps } from './arg';
import { ArgType, ArgTypeDef, ExpressionType } from './types';
import {
  AssetType,
  CanvasElement,
  DatatableColumn,
  ExpressionAstExpression,
  ExpressionContext,
  ExpressionValue,
} from '../../types';

export interface DataArg {
  arg: Arg | undefined;
  argValues?: Array<string | Ast | null>;
  skipRender?: boolean;
  label?: 'string';
}

export type RenderArgData = BaseFormProps & {
  argType: ArgType;
  argTypeDef?: ArgTypeDef;
  args: Record<string, Array<Ast | string>> | null;
  argResolver: (ast: ExpressionAstExpression) => Promise<ExpressionValue>;
  context?: ExpressionContext;
  contextExpression?: string;
  expressionIndex: number;
  expressionType: ExpressionType;
  filterGroups: string[];
  nextArgType?: ArgType;
  nextExpressionType?: ExpressionType;
  onValueAdd: (argName: string, argValue: string | Ast | null) => () => void;
  onValueChange: (argName: string, argIndex: number) => (value: string | Ast) => void;
  onValueRemove: (argName: string, argIndex: number) => () => void;
  onAssetAdd: (type: AssetType['type'], content: AssetType['value']) => string;
  updateContext: (element?: CanvasElement) => void;
  typeInstance?: ExpressionType;
  columns?: DatatableColumn[];
};

export type RenderArgProps = {
  typeInstance: FunctionForm;
} & RenderArgData;

export type FunctionFormProps = {
  args?: ArgProps[];
  resolve?: (...args: any[]) => any;
} & BaseFormProps;

export class FunctionForm extends BaseForm {
  args: ArgProps[];
  resolve: (...args: any[]) => any;

  constructor(props: FunctionFormProps) {
    super({ ...props });

    this.args = props.args || [];
    this.resolve = props.resolve || (() => ({}));
  }

  renderArg(props: RenderArgProps, dataArg: DataArg) {
    const { onValueRemove, onValueChange, ...passedProps } = props;
    const { arg, argValues, skipRender, label } = dataArg;
    const { argType, expressionIndex } = passedProps;

    // TODO: show some information to the user than an argument was skipped
    if (!arg || skipRender) {
      return null;
    }
    const renderArgWithProps = (
      argValue: string | Ast | null,
      valueIndex: number
    ): ReactElement<any, any> | null =>
      arg.render({
        key: `${argType}-${expressionIndex}-${arg.name}-${valueIndex}`,
        ...passedProps,
        label,
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

  // TODO: Argument adding isn't very good, we should improve this UI
  getAddableArg(props: RenderArgProps, dataArg: DataArg) {
    const { onValueAdd } = props;
    const { arg, argValues, skipRender } = dataArg;

    // skip arguments that aren't defined in the expression type schema
    if (!arg || arg.required || skipRender) {
      return null;
    }
    if (argValues && !arg.multi) {
      return null;
    }

    const value = arg.default == null ? null : fromExpression(arg.default, 'argument');
    return { arg, onValueAdd: onValueAdd(arg.name, value) };
  }

  resolveArg(...args: unknown[]) {
    // basically a no-op placeholder
    return {};
  }

  render(data: RenderArgData) {
    if (!data) {
      data = {
        args: null,
        argTypeDef: undefined,
      } as RenderArgData;
    }
    const { args, argTypeDef } = data;

    // Don't instaniate these until render time, to give the registries a chance to populate.
    const argInstances = this.args.map((argSpec) => new Arg(argSpec));
    if (args === null || !isPlainObject(args)) {
      throw new Error(`Form "${this.name}" expects "args" object`);
    }

    // get a mapping of arg values from the expression and from the renderable's schema
    const argNames = uniq(argInstances.map((arg) => arg.name).concat(Object.keys(args)));
    const dataArgs = argNames.map((argName) => {
      const arg = argInstances.find((argument) => argument.name === argName);
      // if arg is not multi, only preserve the last value found
      // otherwise, leave the value alone (including if the arg is not defined)
      const isMulti = arg && arg.multi;
      const argValues = args[argName] && !isMulti ? [last(args[argName]) ?? null] : args[argName];
      return { arg, argValues };
    });

    // props are passed to resolve and the returned object is mixed into the template props
    const props = { ...data, ...this.resolve(data), typeInstance: this };
    try {
      // allow a hook to override the data args
      const resolvedDataArgs = dataArgs.map((d) => ({ ...d, ...this.resolveArg(d, props) }));

      const argumentForms = compact(
        resolvedDataArgs.map((dataArg) => this.renderArg(props, dataArg))
      );
      const addableArgs = compact(
        resolvedDataArgs.map((dataArg) => this.getAddableArg(props, dataArg))
      );

      if (!addableArgs.length && !argumentForms.length) {
        return null;
      }

      return (
        <SidebarSection>
          <SidebarSectionTitle title={argTypeDef?.displayName} tip={argTypeDef?.help}>
            {addableArgs.length === 0 ? null : <ArgAddPopover options={addableArgs} />}
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

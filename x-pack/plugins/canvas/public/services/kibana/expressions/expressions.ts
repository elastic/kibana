/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromExpression, getType } from '@kbn/interpreter/common';
import { pluck } from 'rxjs/operators';
import {
  ExpressionValue,
  ExpressionAstExpression,
  ExpressionExecutionParams,
} from 'src/plugins/expressions';
import { ExpressionsServiceStart } from '../../../../../../../src/plugins/expressions/public';
import { pluginServices } from '../../../services';

export interface Options {
  castToRender?: boolean;
}

export class CoreExpressionsService {
  constructor(private readonly expressions: ExpressionsServiceStart) {}

  async interpretAst(
    ast: ExpressionAstExpression,
    input: ExpressionValue = null,
    context?: ExpressionExecutionParams
  ): Promise<ExpressionValue> {
    return await this.expressions
      .execute(ast, input, context ?? {})
      .getData()
      .pipe(pluck('result'))
      .toPromise();
  }

  async runInterpreter(
    ast: ExpressionAstExpression,
    input: ExpressionValue,
    context?: ExpressionExecutionParams,
    options: Options = {}
  ): Promise<ExpressionValue> {
    try {
      const renderable = await this.interpretAst(ast, input, context);

      if (getType(renderable) === 'render') {
        return renderable;
      }

      if (options.castToRender) {
        return this.runInterpreter(fromExpression('render'), renderable, context, {
          castToRender: false,
        });
      }

      throw new Error(`Ack! I don't know how to render a '${getType(renderable)}'`);
    } catch (err) {
      pluginServices.getServices().notify.error(err);
      throw err;
    }
  }

  getRenderer(name: string) {
    return this.expressions.getRenderer(name);
  }

  getFunctions() {
    return this.expressions.getFunctions();
  }
}

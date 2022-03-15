/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { fromExpression, getType } from '@kbn/interpreter';
import {
  ExpressionAstExpression,
  ExpressionExecutionParams,
  ExpressionValue,
} from 'src/plugins/expressions';
import { pluck } from 'rxjs/operators';
import { buildEmbeddableFilters } from '../../../common/lib/build_embeddable_filters';
import { ExpressionsServiceStart } from '../../../../../../src/plugins/expressions/public';
import { KibanaPluginServiceFactory } from '../../../../../../src/plugins/presentation_util/public';
import { CanvasStartDeps } from '../../plugin';
import { CanvasFiltersService } from './filters';
import { CanvasNotifyService } from '../notify';

interface Options {
  castToRender?: boolean;
}

export class ExpressionsService {
  private filters: CanvasFiltersService;
  private notify: CanvasNotifyService;

  constructor(
    private readonly expressions: ExpressionsServiceStart,
    { filters, notify }: CanvasExpressionsServiceRequiredServices
  ) {
    this.filters = filters;
    this.notify = notify;
  }

  async interpretAst(
    ast: ExpressionAstExpression,
    variables: Record<string, any>,
    input: ExpressionValue = null
  ) {
    const context = await this.getGlobalContext();
    return await this.interpretAstWithContext(ast, input, {
      ...(context ?? {}),
      variables,
    });
  }

  async interpretAstWithContext(
    ast: ExpressionAstExpression,
    input: ExpressionValue = null,
    context?: ExpressionExecutionParams
  ): Promise<ExpressionValue> {
    return await this.expressions
      .execute(ast, input, { ...context, namespace: 'canvas' })
      .getData()
      .pipe(pluck('result'))
      .toPromise();
  }

  /**
   * Runs interpreter, usually in the browser
   *
   * @param {object} ast - Executable AST
   * @param {any} input - Initial input for AST execution
   * @param {object} variables - Variables to pass in to the intrepreter context
   * @param {object} options
   * @param {boolean} options.castToRender - try to cast to a type: render object?
   * @returns {Promise<ExpressionValue>}
   */
  async runInterpreter(
    ast: ExpressionAstExpression,
    input: ExpressionValue,
    variables: Record<string, any>,
    options: Options = {}
  ): Promise<ExpressionValue> {
    const context = await this.getGlobalContext();
    const fullContext = { ...(context ?? {}), variables };

    try {
      const renderable = await this.interpretAstWithContext(ast, input, fullContext);

      if (getType(renderable) === 'render') {
        return renderable;
      }

      if (options.castToRender) {
        return this.runInterpreter(fromExpression('render'), renderable, fullContext, {
          castToRender: false,
        });
      }

      throw new Error(`Ack! I don't know how to render a '${getType(renderable)}'`);
    } catch (err) {
      this.notify.error(err);
      throw err;
    }
  }

  getRenderer(name: string) {
    return this.expressions.getRenderer(name);
  }

  getFunctions() {
    return this.expressions.getFunctions();
  }

  private async getFilters() {
    const filtersList = this.filters.getFilters();
    const context = this.filters.getFiltersContext();
    const filterExpression = filtersList.join(' | ');
    const filterAST = fromExpression(filterExpression);
    return await this.interpretAstWithContext(filterAST, null, context);
  }

  private async getGlobalContext() {
    const canvasFilters = await this.getFilters();
    const kibanaFilters = buildEmbeddableFilters(canvasFilters ? canvasFilters.and : []);
    return {
      searchContext: { ...kibanaFilters },
    };
  }
}

export type CanvasExpressionsService = ExpressionsService;
export interface CanvasExpressionsServiceRequiredServices {
  notify: CanvasNotifyService;
  filters: CanvasFiltersService;
}

export type CanvasExpressionsServiceFactory = KibanaPluginServiceFactory<
  CanvasExpressionsService,
  CanvasStartDeps,
  CanvasExpressionsServiceRequiredServices
>;

export const expressionsServiceFactory: CanvasExpressionsServiceFactory = (
  { startPlugins },
  requiredServices
) => new ExpressionsService(startPlugins.expressions, requiredServices);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { fromExpression } from '@kbn/interpreter/common';
import { ExpressionAstExpression, ExpressionValue } from 'src/plugins/expressions';
import { buildEmbeddableFilters } from '../../../../common/lib/build_embeddable_filters';
import { ExpressionsServiceStart } from '../../../../../../../src/plugins/expressions/public';
import { KibanaPluginServiceFactory } from '../../../../../../../src/plugins/presentation_util/public';
import { CanvasStartDeps } from '../../../plugin';
import { CoreExpressionsService } from './expressions';
import type { Options } from './expressions';
import { FiltersService } from './filters';

export class ExpressionsService {
  private expressionsService: CoreExpressionsService;
  private filtersService: FiltersService;

  constructor(expressions: ExpressionsServiceStart) {
    this.expressionsService = new CoreExpressionsService(expressions);
    this.filtersService = new FiltersService();
  }

  async interpretAst(
    ast: ExpressionAstExpression,
    variables: Record<string, any>,
    input: ExpressionValue = null
  ) {
    const context = await this.getGlobalContext();
    return await this.expressionsService.interpretAst(ast, input, {
      ...(context ?? {}),
      variables,
    });
  }

  /**
   * Runs interpreter, usually in the browser
   *
   * @param {object} ast - Executable AST
   * @param {any} input - Initial input for AST execution
   * @param {object} variables - Variables to pass in to the intrepreter context
   * @param {object} options
   * @param {boolean} options.castToRender - try to cast to a type: render object?
   * @returns {promise}
   */
  async runInterpreter(
    ast: ExpressionAstExpression,
    input: ExpressionValue,
    variables: Record<string, any>,
    options: Options = {}
  ) {
    const context = await this.getGlobalContext();
    const fullContext = { ...(context ?? {}), variables };
    return await this.expressionsService.runInterpreter(ast, input, fullContext, options);
  }

  getRenderer(name: string) {
    return this.expressionsService.getRenderer(name);
  }

  getFunctions() {
    return this.expressionsService.getFunctions();
  }

  async getFilters() {
    const filtersList = this.filtersService.getFilters();
    const filterExpression = filtersList.join(' | ');
    const filterAST = fromExpression(filterExpression);
    const context = this.filtersService.getFiltersContext();
    return await this.expressionsService.interpretAst(filterAST, null, context);
  }

  setFilter(filterId: string, filterExpression: string) {
    this.filtersService.setFilter(filterId, filterExpression);
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
export type CanvasExpressionsServiceFactory = KibanaPluginServiceFactory<
  CanvasExpressionsService,
  CanvasStartDeps
>;

export const expressionsServiceFactory: CanvasExpressionsServiceFactory = ({ startPlugins }) =>
  new ExpressionsService(startPlugins.expressions);

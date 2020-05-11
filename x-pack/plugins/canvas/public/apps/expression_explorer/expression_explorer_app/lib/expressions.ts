/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionAstExpression } from 'src/plugins/expressions';

import { ExpressionsService, ExpressionFunction, Execution } from 'src/plugins/expressions';
import { plugin, ExpressionRenderDefinition } from 'src/plugins/expressions/public';

// @ts-ignore
import { renderFunctions } from './renderers';
import { CanvasFunction } from '../../../../../types';

let expressionsService: ExpressionsService | null = null;

export const getExpressionsService = (
  functionDefinitions: CanvasFunction[]
): {
  getExecution: (ast: ExpressionAstExpression) => Execution;
  getFunctions: () => Record<string, ExpressionFunction>;
} => {
  if (!expressionsService) {
    const placeholder = {} as any;
    const expressionsPlugin = plugin(placeholder);
    const setup = expressionsPlugin.setup(placeholder, {
      inspector: {},
    } as any);
    expressionsService = setup.fork();
    const { registerFunction, registerRenderer } = expressionsService;
    functionDefinitions.forEach(fn => registerFunction(fn));

    renderFunctions.forEach((fn: ExpressionRenderDefinition) => {
      if (fn) {
        registerRenderer(fn);
      }
    });
  }

  return {
    getExecution: ast => {
      if (!expressionsService) {
        throw new Error("expressionsService should exist, but it doesn't");
      }

      const execution = expressionsService.executor.createExecution(
        ast,
        { type: null },
        { debug: true }
      );
      execution.start();
      return execution;
    },
    getFunctions: () => {
      if (!expressionsService) {
        throw new Error("expressionsService should exist, but it doesn't");
      }
      return expressionsService.getFunctions();
    },
  };
};

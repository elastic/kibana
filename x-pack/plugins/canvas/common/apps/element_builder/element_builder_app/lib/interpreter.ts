/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npSetup } from 'ui/new_platform';
import { Ast } from '@kbn/interpreter/target/common';

// @ts-ignore
import { renderFunctions } from './renderers';
import {
  plugin,
  ExpressionInterpretWithHandlers,
  ExpressionRenderDefinition,
} from '../../../../../../../../../src/plugins/expressions/public';
import { CanvasFunction } from '../../../../../types';

let interpretAstFn: ExpressionInterpretWithHandlers | null = null;

export const getInterpretAst = (functionDefinitions: CanvasFunction[]) => {
  if (!interpretAstFn) {
    const { expressions } = npSetup.plugins;

    if (expressions) {
      interpretAstFn = expressions.__LEGACY.getExecutor().interpreter.debugAst;
    } else {
      const placeholder = {} as any;
      const expressionsPlugin = plugin(placeholder);
      const setup = expressionsPlugin.setup(placeholder, {
        inspector: {},
      } as any);
      const { getExecutor, functions, renderers } = setup.__LEGACY;
      functionDefinitions.forEach(fn => functions.register(fn));
      renderFunctions.forEach((fn: ExpressionRenderDefinition) => {
        if (fn) {
          renderers.register(fn);
        }
      });

      interpretAstFn = getExecutor().interpreter.debugAst;
    }
  }

  return (ast: Ast) => {
    if (!interpretAstFn) {
      throw new Error("interpretAst should exist, but it doesn't");
    }

    return interpretAstFn(
      ast,
      { type: 'null' },
      {
        getInitialContext: () => ({
          type: 'kibana_context',
        }),
      }
    );
  };
};

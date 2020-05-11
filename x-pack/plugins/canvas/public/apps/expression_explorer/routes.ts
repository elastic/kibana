/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch } from 'redux';
import { ExpressionExplorerApp } from './expression_explorer_app';

interface ExpressionExplorerParams {
  params: {
    encodedExpression?: string;
  };
}

export const routes = [
  {
    name: 'expressionExplorer',
    path: '/builder',
    children: [
      {
        name: 'empty',
        path: '/',
        meta: {
          component: ExpressionExplorerApp,
        },
      },
      {
        name: 'provided',
        path: '/:encodedExpression',
        action: (dispatch: Dispatch) => ({ params }: ExpressionExplorerParams) => {
          try {
            const { encodedExpression } = params;
            if (encodedExpression) {
              const expression = atob(encodedExpression + '==');
              if (expression) {
                // dispatch(setExpression(expression));
              }
            }
          } catch {
            // ignore
          }
        },
        meta: {
          component: ExpressionExplorerApp,
        },
      },
    ],
  },
];

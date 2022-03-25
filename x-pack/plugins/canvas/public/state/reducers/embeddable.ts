/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromExpression, toExpression } from '@kbn/interpreter';
import { handleActions } from 'redux-actions';
import { State } from '../../../types';

import {
  UpdateEmbeddableExpressionActionType,
  UpdateEmbeddableExpressionPayload,
} from '../actions/embeddable';

// @ts-expect-error untyped local
import { assignNodeProperties } from './elements';

export const embeddableReducer = handleActions<
  State['persistent']['workpad'],
  UpdateEmbeddableExpressionPayload
>(
  {
    [UpdateEmbeddableExpressionActionType]: (workpadState, { payload }) => {
      if (!payload) {
        return workpadState;
      }

      const { elementId, embeddableExpression } = payload;

      // Find the element
      const pageWithElement = workpadState.pages.find((page) => {
        return page.elements.find((element) => element.id === elementId) !== undefined;
      });

      if (!pageWithElement) {
        return workpadState;
      }

      const element = pageWithElement.elements.find((elem) => elem.id === elementId);

      if (!element || element.expression === embeddableExpression) {
        return workpadState;
      }

      const existingAst = fromExpression(element.expression);
      const newAst = fromExpression(embeddableExpression);
      const searchForFunction = newAst.chain[0].function;

      // Find the first matching function in the existing ASt
      const existingAstFunction = existingAst.chain.find((f) => f.function === searchForFunction);

      if (!existingAstFunction) {
        return workpadState;
      }

      existingAstFunction.arguments = newAst.chain[0].arguments;

      const updatedExpression = toExpression(existingAst);

      return assignNodeProperties(workpadState, pageWithElement.id, elementId, {
        expression: updatedExpression,
      });
    },
  },
  {} as State['persistent']['workpad']
);

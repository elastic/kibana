/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionTypeDefinition } from '@kbn/expressions-plugin';
import { EmbeddableInput } from '../../types';
import { EmbeddableTypes } from './embeddable_types';

export const EmbeddableExpressionType = 'embeddable';
export type { EmbeddableInput };
export { EmbeddableTypes };

export interface EmbeddableExpression<Input extends EmbeddableInput> {
  /**
   * The type of the expression result
   */
  type: typeof EmbeddableExpressionType;
  /**
   * The input to be passed to the embeddable
   */
  input: Input;
  /**
   * The type of embeddable
   */
  embeddableType: string;
  /**
   * Timestamp. Needed to get a different result after each time the expression is evaluated
   * to force a reload of the embeddables internal data
   */
  generatedAt: number;
}

export const embeddableType = (): ExpressionTypeDefinition<
  typeof EmbeddableExpressionType,
  EmbeddableExpression<any>
> => ({
  name: EmbeddableExpressionType,
  to: {
    render: (embeddableExpression: EmbeddableExpression<any>) => {
      return {
        type: 'render',
        as: EmbeddableExpressionType,
        value: embeddableExpression,
      };
    },
  },
});

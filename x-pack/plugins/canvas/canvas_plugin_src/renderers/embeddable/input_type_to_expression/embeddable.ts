/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toExpression as toExpressionString } from '@kbn/interpreter/common';
import { PaletteRegistry } from 'src/plugins/charts/public';
import { encode } from '../../../../common/lib/embeddable_dataurl';
import { EmbeddableInput } from '../../../expression_types';

/*
  Take the input from an embeddable and the type of embeddable and convert it into an expression
*/
export function toExpression(
  input: EmbeddableInput,
  embeddableType: string,
  palettes: PaletteRegistry
): string {
  const expressionParts = [] as string[];

  expressionParts.push('embeddable');

  expressionParts.push(`config="${encode(input)}"`);

  expressionParts.push(`type="${embeddableType}"`);

  if (input.palette) {
    expressionParts.push(
      `palette={${toExpressionString(
        palettes.get(input.palette.name).toExpression(input.palette.params)
      )}}`
    );
  }

  return expressionParts.join(' ');
}

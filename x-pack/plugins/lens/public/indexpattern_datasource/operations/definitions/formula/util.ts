/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupBy, isObject } from 'lodash';
import { i18n } from '@kbn/i18n';
import type {
  TinymathAST,
  TinymathFunction,
  TinymathNamedArgument,
  TinymathVariable,
} from 'packages/kbn-tinymath';
import type { OperationDefinition, IndexPatternColumn } from '../index';
import type { GroupedNodes } from './types';

export function groupArgsByType(args: TinymathAST[]) {
  const { namedArgument, variable, function: functions } = groupBy<TinymathAST>(
    args,
    (arg: TinymathAST) => {
      return isObject(arg) ? arg.type : 'variable';
    }
  ) as GroupedNodes;
  // better naming
  return {
    namedArguments: namedArgument || [],
    variables: variable || [],
    functions: functions || [],
  };
}

export function getValueOrName(node: TinymathAST) {
  if (!isObject(node)) {
    return node;
  }
  if (node.type !== 'function') {
    return node.value;
  }
  return node.name;
}

export function getOperationParams(
  operation:
    | OperationDefinition<IndexPatternColumn, 'field'>
    | OperationDefinition<IndexPatternColumn, 'fullReference'>,
  params: TinymathNamedArgument[] = []
): Record<string, string | number> {
  const formalArgs: Record<string, string> = (operation.operationParams || []).reduce(
    (memo: Record<string, string>, { name, type }) => {
      memo[name] = type;
      return memo;
    },
    {}
  );

  return params.reduce<Record<string, string | number>>((args, { name, value }) => {
    if (formalArgs[name]) {
      args[name] = value;
    }
    if (operation.filterable && (name === 'kql' || name === 'lucene')) {
      args[name] = value;
    }
    return args;
  }, {});
}

// Todo: i18n everything here
export const tinymathFunctions: Record<
  string,
  {
    positionalArguments: Array<{
      name: string;
      optional?: boolean;
    }>;
    // help: React.ReactElement;
    // Help is in Markdown format
    help: string;
  }
> = {
  add: {
    positionalArguments: [
      { name: i18n.translate('xpack.lens.formula.left', { defaultMessage: 'left' }) },
      { name: i18n.translate('xpack.lens.formula.right', { defaultMessage: 'right' }) },
    ],
    help: `
# add \`+\`
Adds up two numbers.
Also works with + symbol

Example: Calculate the sum of two fields \`sum(price) + sum(tax)\`

Example: Offset count by a static value \`add(count(), 5)\`
    `,
  },
  subtract: {
    positionalArguments: [
      { name: i18n.translate('xpack.lens.formula.left', { defaultMessage: 'left' }) },
      { name: i18n.translate('xpack.lens.formula.right', { defaultMessage: 'right' }) },
    ],
    help: `
# subtract \`-\`
Subtracts the first number from the second number.
Also works with ${'`-`'} symbol

Example: Calculate the range of a field ${'`subtract(max(bytes), min(bytes))`'}
    `,
  },
  multiply: {
    positionalArguments: [
      { name: i18n.translate('xpack.lens.formula.left', { defaultMessage: 'left' }) },
      { name: i18n.translate('xpack.lens.formula.right', { defaultMessage: 'right' }) },
    ],
    help: `
# multiply \`*\`
Multiplies two numbers.
Also works with ${'`*`'} symbol.

Example: Calculate price after current tax rate ${'`sum(bytes) * last_value(tax_rate)`'}

Example: Calculate price after constant tax rate \`multiply(sum(price), 1.2)\`
    `,
  },
  divide: {
    positionalArguments: [
      { name: i18n.translate('xpack.lens.formula.left', { defaultMessage: 'left' }) },
      { name: i18n.translate('xpack.lens.formula.right', { defaultMessage: 'right' }) },
    ],
    help: `
# divide \`/\`
Divides the first number by the second number.
Also works with ${'`/`'} symbol

Example: Calculate profit margin \`sum(profit) / sum(revenue)\`
    `,
  },
  abs: {
    positionalArguments: [
      { name: i18n.translate('xpack.lens.formula.expression', { defaultMessage: 'expression' }) },
    ],
    help: `
# abs
Calculates absolute value. A negative value is multiplied by -1, a positive value stays the same.

Example: Calculate average distance to sea level ${'`abs(average(altitude))`'}
    `,
  },
  cbrt: {
    positionalArguments: [
      { name: i18n.translate('xpack.lens.formula.expression', { defaultMessage: 'expression' }) },
    ],
    help: `
# cbrt
Cube root of value.

Example: Calculate side length from volume ${'`cbrt(last_value(volume))`'}
    `,
  },
  ceil: {
    positionalArguments: [
      { name: i18n.translate('xpack.lens.formula.expression', { defaultMessage: 'expression' }) },
    ],
    help: `
# ceil
Ceiling of value, rounds up.

Example: Round up price to the next dollar ${'`ceil(sum(price))`'}
    `,
  },
  clamp: {
    positionalArguments: [
      { name: i18n.translate('xpack.lens.formula.expression', { defaultMessage: 'expression' }) },
      { name: i18n.translate('xpack.lens.formula.min', { defaultMessage: 'min' }) },
      { name: i18n.translate('xpack.lens.formula.max', { defaultMessage: 'max' }) },
    ],
    help: `
# clamp
Limits the value from a minimum to maximum.

Example: Make sure to catch outliers ${'`clamp(average(bytes), percentile(bytes, percentile=5), percentile(bytes, percentile=95))`'}
    `,
  },
  cube: {
    positionalArguments: [
      { name: i18n.translate('xpack.lens.formula.expression', { defaultMessage: 'expression' }) },
    ],
    help: `
# cube
Calculates the cube of a number.

Example: Calculate volume from side length ${'`cube(last_value(length))`'}
    `,
  },
  exp: {
    positionalArguments: [
      { name: i18n.translate('xpack.lens.formula.expression', { defaultMessage: 'expression' }) },
    ],
    help: `
# exp
Raises <em>e</em> to the nth power.

Example: Calculate the natural expontential function ${'`exp(last_value(duration))`'}
    `,
  },
  fix: {
    positionalArguments: [
      { name: i18n.translate('xpack.lens.formula.expression', { defaultMessage: 'expression' }) },
    ],
    help: `
# fix
For positive values, takes the floor. For negative values, takes the ceiling.

Example: Rounding towards zero ${'`fix(sum(profit))`'}
    `,
  },
  floor: {
    positionalArguments: [
      { name: i18n.translate('xpack.lens.formula.expression', { defaultMessage: 'expression' }) },
    ],
    help: `
# floor
Round down to nearest integer value

Example: Round down a price ${'`floor(sum(price))`'}
    `,
  },
  log: {
    positionalArguments: [
      { name: i18n.translate('xpack.lens.formula.expression', { defaultMessage: 'expression' }) },
      {
        name: i18n.translate('xpack.lens.formula.base', { defaultMessage: 'base' }),
        optional: true,
      },
    ],
    help: `
# log
Logarithm with optional base. The natural base <em>e</em> is used as default.

Example: Calculate number of bits required to store values ${'`log(max(price), 2)`'}
    `,
  },
  // TODO: check if this is valid for Tinymath
  //   log10: {
  //     positionalArguments: [
  //       { name: i18n.translate('xpack.lens.formula.expression', { defaultMessage: 'expression' }) },
  //     ],
  //     help: `
  // Base 10 logarithm.
  // Example: ${'`log10(sum(bytes))`'}
  //     `,
  //   },
  mod: {
    positionalArguments: [
      { name: i18n.translate('xpack.lens.formula.expression', { defaultMessage: 'expression' }) },
      {
        name: i18n.translate('xpack.lens.formula.base', { defaultMessage: 'base' }),
        optional: true,
      },
    ],
    help: `
# mod
Remainder after dividing the function by a number

Example: Calculate last three digits of a value ${'`mod(sum(price), 1000)`'}
    `,
  },
  pow: {
    positionalArguments: [
      { name: i18n.translate('xpack.lens.formula.expression', { defaultMessage: 'expression' }) },
      {
        name: i18n.translate('xpack.lens.formula.base', { defaultMessage: 'base' }),
      },
    ],
    help: `
# pow
Raises the value to a certain power. The second argument is required

Example: Calculate volume based on side length ${'`pow(last_value(length), 3)`'}
    `,
  },
  round: {
    positionalArguments: [
      { name: i18n.translate('xpack.lens.formula.expression', { defaultMessage: 'expression' }) },
      {
        name: i18n.translate('xpack.lens.formula.decimals', { defaultMessage: 'decimals' }),
        optional: true,
      },
    ],
    help: `
# round
Rounds to a specific number of decimal places, default of 0

Example: Round to the cent ${'`round(sum(price), 2)`'}
    `,
  },
  sqrt: {
    positionalArguments: [
      { name: i18n.translate('xpack.lens.formula.expression', { defaultMessage: 'expression' }) },
    ],
    help: `
# sqrt
Square root of a positive value only

Example: Calculate side length based on area ${'`sqrt(last_value(area))`'}
    `,
  },
  square: {
    positionalArguments: [
      { name: i18n.translate('xpack.lens.formula.expression', { defaultMessage: 'expression' }) },
    ],
    help: `
# square
Raise the value to the 2nd power

Example: Calculate area based on side length ${'`square(last_value(length))`'}
    `,
  },
};

export function isMathNode(node: TinymathAST) {
  return isObject(node) && node.type === 'function' && tinymathFunctions[node.name];
}

export function findMathNodes(root: TinymathAST | string): TinymathFunction[] {
  function flattenMathNodes(node: TinymathAST | string): TinymathFunction[] {
    if (!isObject(node) || node.type !== 'function' || !isMathNode(node)) {
      return [];
    }
    return [node, ...node.args.flatMap(flattenMathNodes)].filter(Boolean);
  }
  return flattenMathNodes(root);
}

// traverse a tree and find all string leaves
export function findVariables(node: TinymathAST | string): TinymathVariable[] {
  if (typeof node === 'string') {
    return [
      {
        type: 'variable',
        value: node,
        text: node,
        location: { min: 0, max: 0 },
      },
    ];
  }
  if (node == null) {
    return [];
  }
  if (typeof node === 'number' || node.type === 'namedArgument') {
    return [];
  }
  if (node.type === 'variable') {
    // leaf node
    return [node];
  }
  return node.args.flatMap(findVariables);
}

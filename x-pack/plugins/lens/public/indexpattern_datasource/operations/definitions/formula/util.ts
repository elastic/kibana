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
import type { Query } from 'src/plugins/data/public';
import type {
  OperationDefinition,
  GenericIndexPatternColumn,
  GenericOperationDefinition,
} from '../index';
import type { GroupedNodes } from './types';

export const unquotedStringRegex = /[^0-9A-Za-z._@\[\]/]/;

export function groupArgsByType(args: TinymathAST[]) {
  const {
    namedArgument,
    variable,
    function: functions,
  } = groupBy<TinymathAST>(args, (arg: TinymathAST) => {
    return isObject(arg) ? arg.type : 'variable';
  }) as GroupedNodes;
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

export function mergeWithGlobalFilter(
  operation:
    | OperationDefinition<GenericIndexPatternColumn, 'field'>
    | OperationDefinition<GenericIndexPatternColumn, 'fullReference'>,
  mappedParams: Record<string, string | number>,
  globalFilter?: Query
) {
  if (globalFilter && operation.filterable) {
    const languageKey = 'kql' in mappedParams ? 'kql' : 'lucene';
    if (mappedParams[languageKey]) {
      // ignore the initial empty string case
      if (globalFilter.query) {
        mappedParams[languageKey] = `(${globalFilter.query}) AND (${mappedParams[languageKey]})`;
      }
    } else {
      const language = globalFilter.language === 'kuery' ? 'kql' : globalFilter.language;
      mappedParams[language] = globalFilter.query as string;
    }
  }
  return mappedParams;
}

export function getOperationParams(
  operation:
    | OperationDefinition<GenericIndexPatternColumn, 'field'>
    | OperationDefinition<GenericIndexPatternColumn, 'fullReference'>,
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
    if (operation.shiftable && name === 'shift') {
      args[name] = value;
    }
    return args;
  }, {});
}

function getTypeI18n(type: string) {
  if (type === 'number') {
    return i18n.translate('xpack.lens.formula.number', { defaultMessage: 'number' });
  }
  if (type === 'string') {
    return i18n.translate('xpack.lens.formula.string', { defaultMessage: 'string' });
  }
  return '';
}

// Todo: i18n everything here
export const tinymathFunctions: Record<
  string,
  {
    positionalArguments: Array<{
      name: string;
      optional?: boolean;
      defaultValue?: string | number;
      type?: string;
    }>;
    // Help is in Markdown format
    help: string;
  }
> = {
  add: {
    positionalArguments: [
      {
        name: i18n.translate('xpack.lens.formula.left', { defaultMessage: 'left' }),
        type: getTypeI18n('number'),
      },
      {
        name: i18n.translate('xpack.lens.formula.right', { defaultMessage: 'right' }),
        type: getTypeI18n('number'),
      },
    ],
    help: i18n.translate('xpack.lens.formula.addFunction.markdown', {
      defaultMessage: `
Adds up two numbers.
Also works with + symbol

Example: Calculate the sum of two fields

\`sum(price) + sum(tax)\`

Example: Offset count by a static value

\`add(count(), 5)\`
    `,
    }),
  },
  subtract: {
    positionalArguments: [
      {
        name: i18n.translate('xpack.lens.formula.left', { defaultMessage: 'left' }),
        type: getTypeI18n('number'),
      },
      {
        name: i18n.translate('xpack.lens.formula.right', { defaultMessage: 'right' }),
        type: getTypeI18n('number'),
      },
    ],
    help: i18n.translate('xpack.lens.formula.subtractFunction.markdown', {
      defaultMessage: `
Subtracts the first number from the second number.
Also works with \`-\` symbol

Example: Calculate the range of a field
\`subtract(max(bytes), min(bytes))\`
    `,
    }),
  },
  multiply: {
    positionalArguments: [
      {
        name: i18n.translate('xpack.lens.formula.left', { defaultMessage: 'left' }),
        type: getTypeI18n('number'),
      },
      {
        name: i18n.translate('xpack.lens.formula.right', { defaultMessage: 'right' }),
        type: getTypeI18n('number'),
      },
    ],
    help: i18n.translate('xpack.lens.formula.multiplyFunction.markdown', {
      defaultMessage: `
Multiplies two numbers.
Also works with \`*\` symbol.

Example: Calculate price after current tax rate
\`sum(bytes) * last_value(tax_rate)\`

Example: Calculate price after constant tax rate
\`multiply(sum(price), 1.2)\`
    `,
    }),
  },
  divide: {
    positionalArguments: [
      {
        name: i18n.translate('xpack.lens.formula.left', { defaultMessage: 'left' }),
        type: getTypeI18n('number'),
      },
      {
        name: i18n.translate('xpack.lens.formula.right', { defaultMessage: 'right' }),
        type: getTypeI18n('number'),
      },
    ],
    help: i18n.translate('xpack.lens.formula.divideFunction.markdown', {
      defaultMessage: `
Divides the first number by the second number.
Also works with \`/\` symbol

Example: Calculate profit margin
\`sum(profit) / sum(revenue)\`

Example: \`divide(sum(bytes), 2)\`
    `,
    }),
  },
  abs: {
    positionalArguments: [
      {
        name: i18n.translate('xpack.lens.formula.value', { defaultMessage: 'value' }),
        type: getTypeI18n('number'),
      },
    ],
    help: i18n.translate('xpack.lens.formula.absFunction.markdown', {
      defaultMessage: `
Calculates absolute value. A negative value is multiplied by -1, a positive value stays the same.

Example: Calculate average distance to sea level \`abs(average(altitude))\`
    `,
    }),
  },
  cbrt: {
    positionalArguments: [
      {
        name: i18n.translate('xpack.lens.formula.value', { defaultMessage: 'value' }),
        type: getTypeI18n('number'),
      },
    ],
    help: i18n.translate('xpack.lens.formula.cbrtFunction.markdown', {
      defaultMessage: `
Cube root of value.

Example: Calculate side length from volume
\`cbrt(last_value(volume))\`
    `,
    }),
  },
  ceil: {
    positionalArguments: [
      {
        name: i18n.translate('xpack.lens.formula.value', { defaultMessage: 'value' }),
        type: getTypeI18n('number'),
      },
    ],
    help: i18n.translate('xpack.lens.formula.ceilFunction.markdown', {
      defaultMessage: `
Ceiling of value, rounds up.

Example: Round up price to the next dollar
\`ceil(sum(price))\`
    `,
    }),
  },
  clamp: {
    positionalArguments: [
      {
        name: i18n.translate('xpack.lens.formula.value', { defaultMessage: 'value' }),
        type: getTypeI18n('number'),
      },
      {
        name: i18n.translate('xpack.lens.formula.min', { defaultMessage: 'min' }),
        type: getTypeI18n('number'),
      },
      {
        name: i18n.translate('xpack.lens.formula.max', { defaultMessage: 'max' }),
        type: getTypeI18n('number'),
      },
    ],
    help: i18n.translate('xpack.lens.formula.clampFunction.markdown', {
      defaultMessage: `
Limits the value from a minimum to maximum.

Example: Make sure to catch outliers
\`\`\`
clamp(
  average(bytes),
  percentile(bytes, percentile=5),
  percentile(bytes, percentile=95)
)
\`\`\`
`,
    }),
  },
  cube: {
    positionalArguments: [
      {
        name: i18n.translate('xpack.lens.formula.value', { defaultMessage: 'value' }),
        type: getTypeI18n('number'),
      },
    ],
    help: i18n.translate('xpack.lens.formula.cubeFunction.markdown', {
      defaultMessage: `
Calculates the cube of a number.

Example: Calculate volume from side length
\`cube(last_value(length))\`
    `,
    }),
  },
  exp: {
    positionalArguments: [
      {
        name: i18n.translate('xpack.lens.formula.value', { defaultMessage: 'value' }),
        type: getTypeI18n('number'),
      },
    ],
    help: i18n.translate('xpack.lens.formula.expFunction.markdown', {
      defaultMessage: `
Raises *e* to the nth power.

Example: Calculate the natural exponential function

\`exp(last_value(duration))\`
    `,
    }),
  },
  fix: {
    positionalArguments: [
      {
        name: i18n.translate('xpack.lens.formula.value', { defaultMessage: 'value' }),
        type: getTypeI18n('number'),
      },
    ],
    help: i18n.translate('xpack.lens.formula.fixFunction.markdown', {
      defaultMessage: `
For positive values, takes the floor. For negative values, takes the ceiling.

Example: Rounding towards zero
\`fix(sum(profit))\`
    `,
    }),
  },
  floor: {
    positionalArguments: [
      {
        name: i18n.translate('xpack.lens.formula.value', { defaultMessage: 'value' }),
        type: getTypeI18n('number'),
      },
    ],
    help: i18n.translate('xpack.lens.formula.floorFunction.markdown', {
      defaultMessage: `
Round down to nearest integer value

Example: Round down a price
\`floor(sum(price))\`
    `,
    }),
  },
  log: {
    positionalArguments: [
      {
        name: i18n.translate('xpack.lens.formula.value', { defaultMessage: 'value' }),
        type: getTypeI18n('number'),
      },
      {
        name: i18n.translate('xpack.lens.formula.base', { defaultMessage: 'base' }),
        optional: true,
        defaultValue: 'e',
        type: getTypeI18n('number'),
      },
    ],
    help: i18n.translate('xpack.lens.formula.logFunction.markdown', {
      defaultMessage: `
Logarithm with optional base. The natural base *e* is used as default.

Example: Calculate number of bits required to store values
\`\`\`
log(sum(bytes))
log(sum(bytes), 2)
\`\`\`
    `,
    }),
  },
  mod: {
    positionalArguments: [
      {
        name: i18n.translate('xpack.lens.formula.value', { defaultMessage: 'value' }),
        type: getTypeI18n('number'),
      },
      {
        name: i18n.translate('xpack.lens.formula.base', { defaultMessage: 'base' }),
        type: getTypeI18n('number'),
      },
    ],
    help: i18n.translate('xpack.lens.formula.modFunction.markdown', {
      defaultMessage: `
Remainder after dividing the function by a number

Example: Calculate last three digits of a value
\`mod(sum(price), 1000)\`
    `,
    }),
  },
  pow: {
    positionalArguments: [
      {
        name: i18n.translate('xpack.lens.formula.value', { defaultMessage: 'value' }),
        type: getTypeI18n('number'),
      },
      {
        name: i18n.translate('xpack.lens.formula.base', { defaultMessage: 'base' }),
        type: getTypeI18n('number'),
      },
    ],
    help: i18n.translate('xpack.lens.formula.powFunction.markdown', {
      defaultMessage: `
Raises the value to a certain power. The second argument is required

Example: Calculate volume based on side length
\`pow(last_value(length), 3)\`
    `,
    }),
  },
  round: {
    positionalArguments: [
      {
        name: i18n.translate('xpack.lens.formula.value', { defaultMessage: 'value' }),
        type: getTypeI18n('number'),
      },
      {
        name: i18n.translate('xpack.lens.formula.decimals', { defaultMessage: 'decimals' }),
        optional: true,
        defaultValue: 0,
        type: getTypeI18n('number'),
      },
    ],
    help: i18n.translate('xpack.lens.formula.roundFunction.markdown', {
      defaultMessage: `
Rounds to a specific number of decimal places, default of 0

Examples: Round to the cent
\`\`\`
round(sum(bytes))
round(sum(bytes), 2)
\`\`\`
    `,
    }),
  },
  sqrt: {
    positionalArguments: [
      {
        name: i18n.translate('xpack.lens.formula.value', { defaultMessage: 'value' }),
        type: getTypeI18n('number'),
      },
    ],
    help: i18n.translate('xpack.lens.formula.sqrtFunction.markdown', {
      defaultMessage: `
Square root of a positive value only

Example: Calculate side length based on area
\`sqrt(last_value(area))\`
    `,
    }),
  },
  square: {
    positionalArguments: [
      {
        name: i18n.translate('xpack.lens.formula.value', { defaultMessage: 'value' }),
        type: getTypeI18n('number'),
      },
    ],
    help: i18n.translate('xpack.lens.formula.squareFunction.markdown', {
      defaultMessage: `
Raise the value to the 2nd power

Example: Calculate area based on side length
\`square(last_value(length))\`
    `,
    }),
  },
};

export function isMathNode(node: TinymathAST | string) {
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

export function filterByVisibleOperation(
  operationDefinitionMap: Record<string, GenericOperationDefinition>
) {
  return Object.fromEntries(
    Object.entries(operationDefinitionMap).filter(([, operation]) => !operation.hidden)
  );
}

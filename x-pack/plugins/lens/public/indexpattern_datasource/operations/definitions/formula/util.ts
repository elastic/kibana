/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupBy, isObject } from 'lodash';
import type {
  TinymathAST,
  TinymathFunction,
  TinymathLocation,
  TinymathNamedArgument,
  TinymathVariable,
} from 'packages/kbn-tinymath';
import { ReferenceBasedIndexPatternColumn } from '../column_types';
import type { OperationDefinition, IndexPatternColumn, GenericOperationDefinition } from '../index';
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

export function getSafeFieldName(fieldName: string | undefined) {
  // clean up the "Records" field for now
  if (!fieldName || fieldName === 'Records') {
    return '';
  }
  return fieldName;
}

// Just handle two levels for now
type OeprationParams = Record<string, string | number | Record<string, string | number>>;

export function extractParamsForFormula(
  column: IndexPatternColumn | ReferenceBasedIndexPatternColumn,
  operationDefinitionMap: Record<string, GenericOperationDefinition> | undefined
) {
  if (!operationDefinitionMap) {
    return [];
  }
  const def = operationDefinitionMap[column.operationType];
  if ('operationParams' in def && column.params) {
    return (def.operationParams || []).flatMap(({ name, required }) => {
      const value = (column.params as OeprationParams)![name];
      if (isObject(value)) {
        return Object.keys(value).map((subName) => ({
          name: `${name}-${subName}`,
          value: value[subName] as string | number,
          required,
        }));
      }
      return {
        name,
        value,
        required,
      };
    });
  }
  return [];
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
    return args;
  }, {});
}

// Todo: i18n everything here
export const tinymathFunctions: Record<
  string,
  {
    positionalArguments: Array<{
      type: 'any' | 'function' | 'number';
      required?: boolean;
    }>;
    // help: React.ReactElement;
    // Help is in Markdown format
    help: string;
  }
> = {
  add: {
    positionalArguments: [{ type: 'any' }, { type: 'any', required: true }],
    help: `
Also works with + symbol
Example: ${'`count() + sum(bytes)`'}
Example: ${'`add(count(), 5)`'}
    `,
  },
  subtract: {
    positionalArguments: [{ type: 'any' }, { type: 'any', required: true }],
    help: `
Also works with ${'`-`'} symbol
Example: ${'`subtract(sum(bytes), avg(bytes))`'}
    `,
  },
  multiply: {
    positionalArguments: [{ type: 'function' }],
    help: `
Also works with ${'`*`'} symbol
Example: ${'`multiply(sum(bytes), 2)`'}
    `,
  },
  divide: {
    positionalArguments: [{ type: 'function' }],
    help: `
Also works with ${'`/`'} symbol
Example: ${'`ceil(sum(bytes))`'}
    `,
  },
  abs: {
    positionalArguments: [{ type: 'function' }],
    help: `
Absolute value
Example: ${'`abs(sum(bytes))`'}
    `,
  },
  cbrt: {
    positionalArguments: [{ type: 'function' }],
    help: `
Cube root of value
Example: ${'`cbrt(sum(bytes))`'}
    `,
  },
  ceil: {
    positionalArguments: [{ type: 'function' }],
    help: `
Ceiling of value, rounds up
Example: ${'`ceil(sum(bytes))`'}
    `,
  },
  clamp: {
    positionalArguments: [{ type: 'function' }, { type: 'number' }, { type: 'number' }],
    help: `
Limits the value from a minimum to maximum
Example: ${'`ceil(sum(bytes))`'}
    `,
  },
  cube: {
    positionalArguments: [{ type: 'function' }],
    help: `
Limits the value from a minimum to maximum
Example: ${'`ceil(sum(bytes))`'}
    `,
  },
  exp: {
    positionalArguments: [{ type: 'function' }],
    help: `
Raises <em>e</em> to the nth power.
Example: ${'`exp(sum(bytes))`'}
    `,
  },
  fix: {
    positionalArguments: [{ type: 'function' }],
    help: `
For positive values, takes the floor. For negative values, takes the ceiling.
Example: ${'`fix(sum(bytes))`'}
    `,
  },
  floor: {
    positionalArguments: [{ type: 'function' }],
    help: `
Round down to nearest integer value
Example: ${'`floor(sum(bytes))`'}
    `,
  },
  log: {
    positionalArguments: [{ type: 'function' }, { type: 'number', required: false }],
    help: `
Logarithm with optional base. The natural base <em>e</em> is used as default.
Example: ${'`log(sum(bytes))`'}
Example: ${'`log(sum(bytes), 2)`'}
    `,
  },
  log10: {
    positionalArguments: [{ type: 'function' }],
    help: `
Base 10 logarithm.
Example: ${'`log10(sum(bytes))`'}
    `,
  },
  mod: {
    positionalArguments: [{ type: 'function' }, { type: 'number', required: true }],
    help: `
Remainder after dividing the function by a number
Example: ${'`mod(sum(bytes), 2)`'}
    `,
  },
  pow: {
    positionalArguments: [{ type: 'function' }, { type: 'number', required: true }],
    help: `
Raises the value to a certain power. The second argument is required
Example: ${'`pow(sum(bytes), 3)`'}
    `,
  },
  round: {
    positionalArguments: [{ type: 'function' }, { type: 'number' }],
    help: `
Rounds to a specific number of decimal places, default of 0
Example: ${'`round(sum(bytes))`'}
Example: ${'`round(sum(bytes), 2)`'}
    `,
  },
  sqrt: {
    positionalArguments: [{ type: 'function' }],
    help: `
Square root of a positive value only
Example: ${'`sqrt(sum(bytes))`'}
    `,
  },
  square: {
    positionalArguments: [{ type: 'function' }],
    help: `
Raise the value to the 2nd power
Example: ${'`square(sum(bytes))`'}
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

export function hasMathNode(root: TinymathAST): boolean {
  return Boolean(findMathNodes(root).length);
}

function findFunctionNodes(root: TinymathAST | string): TinymathFunction[] {
  function flattenFunctionNodes(node: TinymathAST | string): TinymathFunction[] {
    if (!isObject(node) || node.type !== 'function') {
      return [];
    }
    return [node, ...node.args.flatMap(flattenFunctionNodes)].filter(Boolean);
  }
  return flattenFunctionNodes(root);
}

export function hasInvalidOperations(
  node: TinymathAST | string,
  operations: Record<string, GenericOperationDefinition>
): { names: string[]; locations: TinymathLocation[] } {
  const nodes = findFunctionNodes(node).filter((v) => !isMathNode(v) && !operations[v.name]);
  return {
    // avoid duplicates
    names: Array.from(new Set(nodes.map(({ name }) => name))),
    locations: nodes.map(({ location }) => location),
  };
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

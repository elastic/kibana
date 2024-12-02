/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Walker, type ESQLAstQueryExpression } from '@kbn/esql-ast';
import { isDateTruncFunctionNode, isBucketFunctionNode, isStringLiteralNode } from '../typeguards';
import type { ESQLDateTruncFunction, ESQLBucketFunction } from '../types';
import { stringToTimespanLiteral, isTimespanString } from '../ast_tools/timespan';
import { QueryCorrection } from './types';

/**
 * Correct timespan literal grammar mistakes, and returns the list of corrections that got applied.
 *
 * E.g.
 * `DATE_TRUNC("YEAR", @timestamp)` => `DATE_TRUNC(1 year, @timestamp)`
 * `BUCKET(@timestamp, "1 week")` => `BUCKET(@timestamp, 1 week)`
 *
 */
export const correctTimespanLiterals = (
  query: ESQLAstQueryExpression
): QueryCorrection[] => {
  const corrections: QueryCorrection[] = [];

  Walker.walk(query, {
    visitFunction: (node) => {
      if (isDateTruncFunctionNode(node)) {
        corrections.push(...checkDateTrunc(node));
      }
      if (isBucketFunctionNode(node)) {
        corrections.push(...checkBucket(node));
      }
    },
  });

  return corrections;
};

function checkDateTrunc(node: ESQLDateTruncFunction): QueryCorrection[] {
  if (node.args.length !== 2) {
    return [];
  }

  const firstArg = node.args[0];

  if (isStringLiteralNode(firstArg) && isTimespanString(firstArg.value)) {
    const replacement = stringToTimespanLiteral(firstArg.value);
    node.args[0] = replacement;

    const correction: QueryCorrection = {
      type: 'string_as_timespan_literal',
      node,
      description: `Replaced string literal with timespan literal in DATE_TRUNC function at position ${node.location.min}`,
    };
    return [correction];
  }

  return [];
}

function checkBucket(node: ESQLBucketFunction): QueryCorrection[] {
  // only checking the 2 args version - e.g. BUCKET(hire_date, 1 week)
  if (node.args.length !== 2) {
    return [];
  }

  const secondArg = node.args[1];

  if (isStringLiteralNode(secondArg) && isTimespanString(secondArg.value)) {
    const replacement = stringToTimespanLiteral(secondArg.value);
    node.args[1] = replacement;

    const correction: QueryCorrection = {
      type: 'string_as_timespan_literal',
      node,
      description: `Replaced string literal with timespan literal in BUCKET function at position ${node.location.min}`,
    };
    return [correction];
  }

  return [];
}

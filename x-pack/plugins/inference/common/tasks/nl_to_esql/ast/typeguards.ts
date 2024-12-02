/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSingleAstItem, ESQLAstItem, ESQLFunction, ESQLLiteral } from '@kbn/esql-ast';
import type { ESQLStringLiteral, ESQLDateTruncFunction, ESQLBucketFunction } from './types';

export function isSingleItem(item: ESQLAstItem): item is ESQLSingleAstItem {
  return Object.hasOwn(item, 'type');
}

export function isFunctionNode(node: ESQLAstItem): node is ESQLFunction {
  return isSingleItem(node) && node.type === 'function';
}

export function isLiteralNode(node: ESQLAstItem): node is ESQLLiteral {
  return isSingleItem(node) && node.type === 'literal';
}

export function isStringLiteralNode(node: ESQLAstItem): node is ESQLStringLiteral {
  return isLiteralNode(node) && node.literalType === 'keyword';
}

export function isDateTruncFunctionNode(node: ESQLAstItem): node is ESQLDateTruncFunction {
  return isFunctionNode(node) && node.subtype === 'variadic-call' && node.name === 'date_trunc';
}

export function isBucketFunctionNode(node: ESQLAstItem): node is ESQLBucketFunction {
  return isFunctionNode(node) && node.subtype === 'variadic-call' && node.name === 'bucket';
}

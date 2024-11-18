/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionAstExpression } from '@kbn/expressions-plugin/common';
import { get } from 'lodash';
import { PartitionLabelsArguments } from './types';

export const getFieldPath = (field: keyof PartitionLabelsArguments) =>
  `chain.0.arguments.${field}.0`;

export const getFieldValue = (
  ast: null | ExpressionAstExpression,
  field: keyof PartitionLabelsArguments,
  defaultValue?: unknown
) => {
  if (!ast) {
    return undefined;
  }

  return get(ast, getFieldPath(field), defaultValue);
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import * as fs from 'fs';
import * as parser from '@babel/parser';
import type {
  ExpressionStatement,
  Identifier,
  ObjectExpression,
  ObjectProperty,
} from '@babel/types';

export const parseTestFileConfig = (
  filePath: string
): Record<string, string | number | Record<string, string | number>> | undefined => {
  const testFile = fs.readFileSync(filePath, { encoding: 'utf8' });

  const ast = parser.parse(testFile, {
    sourceType: 'module',
    plugins: ['typescript'],
  });

  const expressionStatement = _.find(ast.program.body, ['type', 'ExpressionStatement']) as
    | ExpressionStatement
    | undefined;

  const callExpression = expressionStatement?.expression;
  // @ts-expect-error
  if (expressionStatement?.expression?.arguments?.length === 3) {
    // @ts-expect-error
    const callExpressionArguments = _.find(callExpression?.arguments, [
      'type',
      'ObjectExpression',
    ]) as ObjectExpression | undefined;

    const callExpressionProperties = _.find(callExpressionArguments?.properties, [
      'key.name',
      'env',
    ]) as ObjectProperty[] | undefined;
    // @ts-expect-error
    const ftrConfig = _.find(callExpressionProperties?.value?.properties, [
      'key.name',
      'ftrConfig',
    ]);

    if (!ftrConfig) {
      return {};
    }

    return _.reduce(
      ftrConfig.value.properties,
      (acc: Record<string, string | number | Record<string, string>>, property) => {
        const key = (property.key as Identifier).name;
        let value;
        if (property.value.type === 'ArrayExpression') {
          value = _.map(property.value.elements, (element) => {
            if (element.type === 'StringLiteral') {
              return element.value as string;
            }
            return element.value as string;
          });
        } else if (property.value.type === 'StringLiteral') {
          value = property.value.value;
        }
        if (key && value) {
          acc[key] = value;
        }
        return acc;
      },
      {}
    );
  }
  return undefined;
};

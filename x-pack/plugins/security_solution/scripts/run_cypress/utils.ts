/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import * as fs from 'fs';
import * as parser from '@babel/parser';
import generate from '@babel/generator';
import type { ExpressionStatement, ObjectExpression, ObjectProperty } from '@babel/types';
import { schema, type TypeOf } from '@kbn/config-schema';
import { getExperimentalAllowedValues } from '../../common/experimental_features';

export const parseTestFileConfig = (filePath: string): SecuritySolutionDescribeBlockFtrConfig => {
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

    const ftrConfigCode = generate(ftrConfig.value, { jsonCompatibleStrings: true }).code;

    try {
      // TODO:PT need to assess implication of using this approach to get the JSON back out
      const ftrConfigJson = new Function(`return ${ftrConfigCode}`)();
      return TestFileFtrConfigSchema.validate(ftrConfigJson);
    } catch (err) {
      throw new Error(
        `Failed to parse 'ftrConfig' value defined in 'describe()' at ${filePath}. ${err.message}\nCode: ${ftrConfigCode}`
      );
    }
  }

  return {};
};

const TestFileFtrConfigSchema = schema.object(
  {
    license: schema.maybe(schema.string()),
    enableExperimental: schema.maybe(
      schema.arrayOf(
        schema.string({
          validate: (value) => {
            const allowedValues = getExperimentalAllowedValues();

            if (!allowedValues.includes(value)) {
              return `Invalid [enableExperimental] value {${value}.\nValid values are: [${allowedValues.join(
                ', '
              )}]`;
            }
          },
        })
      )
    ),
    productTypes: schema.maybe(
      // TODO:PT write validate function to ensure that only the correct combinations are used
      schema.arrayOf(
        schema.object({
          product_line: schema.oneOf([
            schema.literal('security'),
            schema.literal('endpoint'),
            schema.literal('cloud'),
          ]),

          product_tier: schema.oneOf([schema.literal('essentials'), schema.literal('complete')]),
        })
      )
    ),
  },
  { defaultValue: {}, unknowns: 'forbid' }
);

export type SecuritySolutionDescribeBlockFtrConfig = TypeOf<typeof TestFileFtrConfigSchema>;

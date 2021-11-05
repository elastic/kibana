/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Ast, fromExpression, toExpression } from '@kbn/interpreter/common';
import immutable from 'object-path-immutable';

const { merge } = immutable;

const exactlyRemapSchema = { column: 'filterColumn', filterGroup: 'filterGroup' };
const timeRemapSchema = { column: 'column', filterGroup: 'filterGroup' };

const remappingSchemas: Record<string, Record<string, string>> = {
  dropdownControl: exactlyRemapSchema,
  exactly: exactlyRemapSchema,
  timefilterControl: timeRemapSchema,
};

const filterExpressionNames = ['dropdownControl', 'timefilterControl', 'exactly'];

const swapPropsWithValues = (record: Record<string, string>) =>
  Object.keys(record).reduce(
    (updatedRecord, row) => ({ ...updatedRecord, [record[row]]: row }),
    {}
  );

const remapArguments = (
  argsToRemap: Record<string, any>,
  remappingSchema: Record<string, string>
) =>
  Object.keys(remappingSchema).reduce((remappedArgs, argName) => {
    const argsKey = remappingSchema[argName];
    return {
      ...remappedArgs,
      ...(argsToRemap[argsKey] ? { [argName]: argsToRemap[argsKey] } : {}),
    };
  }, {});

export const syncFilterWithExpr = (expression: string, filter: string) => {
  const filterAst = fromExpression(filter);
  const expressionAst = fromExpression(expression);
  const filterExpressionAst = expressionAst.chain.find(({ function: fn }) =>
    filterExpressionNames.includes(fn)
  );

  if (!filterExpressionAst) {
    return filter;
  }

  const remappedArgs = remapArguments(
    filterExpressionAst.arguments,
    remappingSchemas[filterExpressionAst.function] ?? remappingSchemas.exactly
  );

  const updatedFilterAst = merge<Ast>(filterAst, `chain.0.arguments`, remappedArgs);
  return toExpression(updatedFilterAst);
};

export const syncExprWithFilter = (expression: string, filter: string) => {
  const filterAst = fromExpression(filter);
  const expressionAst = fromExpression(expression);
  const filterExpressionAstIndex = expressionAst.chain.findIndex(({ function: fn }) =>
    filterExpressionNames.includes(fn)
  );

  if (filterExpressionAstIndex === -1) {
    return expression;
  }

  const filterExpressionAst = expressionAst.chain[filterExpressionAstIndex];
  const filterAstArgs = filterAst.chain[0].arguments ?? {};

  const remappingSchema =
    remappingSchemas[filterExpressionAst.function] ?? remappingSchemas.exactly;
  const remappedArgs = remapArguments(filterAstArgs, swapPropsWithValues(remappingSchema));

  const updatedExpressionAst = merge<Ast>(
    expressionAst,
    `chain.${filterExpressionAstIndex}.arguments`,
    remappedArgs
  );

  return toExpression(updatedExpressionAst);
};

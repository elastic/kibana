/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const compare = () => ({
  name: 'compare',
  help: i18n.translate('xpack.canvas.functions.compareHelpText', {
    defaultMessage:
      'Compare the input to something else to determine true or false. Usually used in combination with `{ifArgument}`. This only works with primitive types, such as number, string, and boolean.',
    values: {
      ifArgument: '{if}',
    },
  }),
  aliases: ['condition'],
  example: 'math "random()" | compare gt this=0.5',
  type: 'boolean',
  context: {
    types: ['null', 'string', 'number', 'boolean'],
  },
  args: {
    op: {
      aliases: ['_'],
      types: ['string'],
      default: 'eq',
      help: i18n.translate('xpack.canvas.functions.compare.args.opHelpText', {
        defaultMessage:
          'The operator to use in the comparison: {eqOperator} (equal), {neOperator} (not equal), {ltOperator} (less than), {gtOperator} (greater than), {lteOperator} (less than equal), {gteOperator} (greater than equal)',
        values: {
          eqOperator: '{eq}',
          neOperator: '{ne}',
          ltOperator: '{lt}',
          gtOperator: '{gt}',
          lteOperator: '{lte}',
          gteOperator: '{gte}',
        },
      }),
      options: ['eq', 'ne', 'lt', 'gt', 'lte', 'gte'],
    },
    to: {
      aliases: ['this', 'b'],
      help: i18n.translate('xpack.canvas.functions.compare.args.toHelpText', {
        defaultMessage: 'The value to compare the context to, usually returned by a subexpression',
      }),
    },
  },
  fn: (context, args) => {
    const a = context;
    const b = args.to;
    const op = args.op;
    const typesMatch = typeof a === typeof b;

    switch (op) {
      case 'eq':
        return a === b;
      case 'ne':
        return a !== b;
      case 'lt':
        if (typesMatch) return a < b;
        return false;
      case 'lte':
        if (typesMatch) return a <= b;
        return false;
      case 'gt':
        if (typesMatch) return a > b;
        return false;
      case 'gte':
        if (typesMatch) return a >= b;
        return false;
      default:
        throw new Error(
          i18n.translate('xpack.canvas.functions.compare.invalidCompareOperatorErrorMessage', {
            defaultMessage:
              'Invalid compare operator. Use {validCompareOperatorsList} or {gteOperator}.',
            values: {
              validCompareOperatorsList: 'eq, ne, lt, gt, lte,',
              gteOperator: 'gte',
            },
          })
        );
    }

    return false;
  },
});

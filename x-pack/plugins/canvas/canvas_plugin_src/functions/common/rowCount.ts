/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { Datatable } from '../../../types';
import { getFunctionHelp } from '../../../i18n';

export function rowCount(): ExpressionFunctionDefinition<'rowCount', Datatable, {}, number> {
  const { help } = getFunctionHelp().rowCount;

  return {
    name: 'rowCount',
    aliases: [],
    type: 'number',
    inputTypes: ['datatable'],
    help,
    args: {},
    fn: (input) => input.rows.length,
  };
}

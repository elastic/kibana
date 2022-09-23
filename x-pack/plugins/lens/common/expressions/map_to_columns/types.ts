/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Datatable, ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';

export type OriginalColumn = { id: string; label: string } & (
  | { operationType: 'date_histogram'; sourceField: string }
  | { operationType: string; sourceField: never }
);

export type MapToColumnsExpressionFunction = ExpressionFunctionDefinition<
  'lens_map_to_columns',
  Datatable,
  {
    idMap: string;
  },
  Datatable | Promise<Datatable>
>;

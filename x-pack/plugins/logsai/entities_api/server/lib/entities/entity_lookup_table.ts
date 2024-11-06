/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQLLookupTableColumns } from '@kbn/es-types/src/search';
import { ValuesType } from 'utility-types';

export interface EntityLookupTable<TColumnName extends string> {
  name: string;
  joins: string[];
  columns: Record<TColumnName, ValuesType<ESQLLookupTableColumns>> & {
    'entity.id': { keyword: Array<string | null> };
  };
}

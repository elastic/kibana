/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NodeDefinition } from '../types';
import { definition as searchDef } from './search_node';
import { definition as joinDef } from './join_node';
import { definition as tableConvertDef } from './table_convert';
import { definition as calculatedColumn } from './table_convert';

export const nodeRegistry: Record<string, NodeDefinition<any>> = {
  search: searchDef,
  join: joinDef,
  convert: tableConvertDef,
  calculatedColumn,
};
